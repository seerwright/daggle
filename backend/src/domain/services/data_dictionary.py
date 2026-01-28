"""Data dictionary service."""

import csv
import io
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.schemas.data_dictionary import DataDictionaryEntryUpdate
from src.domain.models.competition_file import CompetitionFile
from src.domain.models.data_dictionary import DataDictionaryEntry
from src.domain.services.column_suggestions import get_column_suggestion
from src.infrastructure.storage.factory import get_storage_backend


@dataclass
class ColumnInfo:
    """Information about a CSV column."""

    name: str
    dtype: str
    sample_values: list[str]
    null_count: int
    unique_count: int
    suggested_definition: str | None = None
    suggested_encoding: str | None = None
    suggestion_confidence: str = "low"


@dataclass
class PreviewResult:
    """Result of a CSV file preview."""

    columns: list[str]
    rows: list[dict[str, str]]
    total_rows: int
    truncated: bool


class DataDictionaryService:
    """Service for data dictionary operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.storage = get_storage_backend()

    async def list_by_file(self, file_id: int) -> list[DataDictionaryEntry]:
        """List all dictionary entries for a file."""
        result = await self.session.execute(
            select(DataDictionaryEntry)
            .where(DataDictionaryEntry.file_id == file_id)
            .order_by(DataDictionaryEntry.display_order)
        )
        return list(result.scalars().all())

    async def get_by_id(self, entry_id: int) -> DataDictionaryEntry | None:
        """Get a dictionary entry by ID."""
        result = await self.session.execute(
            select(DataDictionaryEntry).where(DataDictionaryEntry.id == entry_id)
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        file_id: int,
        column_name: str,
        definition: str | None = None,
        encoding: str | None = None,
        display_order: int = 0,
    ) -> DataDictionaryEntry:
        """Create a dictionary entry."""
        entry = DataDictionaryEntry(
            file_id=file_id,
            column_name=column_name,
            definition=definition,
            encoding=encoding,
            display_order=display_order,
        )
        self.session.add(entry)
        await self.session.commit()
        await self.session.refresh(entry)
        return entry

    async def update(
        self, entry: DataDictionaryEntry, data: DataDictionaryEntryUpdate
    ) -> DataDictionaryEntry:
        """Update a dictionary entry."""
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(entry, field, value)
        await self.session.commit()
        await self.session.refresh(entry)
        return entry

    async def delete(self, entry: DataDictionaryEntry) -> None:
        """Delete a dictionary entry."""
        await self.session.delete(entry)
        await self.session.commit()

    async def bulk_update(
        self,
        file_id: int,
        entries: list[dict],
    ) -> list[DataDictionaryEntry]:
        """Bulk update or create dictionary entries for a file.

        Each entry dict should have: column_name, definition, encoding, display_order
        """
        # Delete existing entries for this file
        existing = await self.list_by_file(file_id)
        for entry in existing:
            await self.session.delete(entry)

        # Create new entries
        new_entries = []
        for i, entry_data in enumerate(entries):
            entry = DataDictionaryEntry(
                file_id=file_id,
                column_name=entry_data.get("column_name", ""),
                definition=entry_data.get("definition"),
                encoding=entry_data.get("encoding"),
                display_order=entry_data.get("display_order", i),
            )
            self.session.add(entry)
            new_entries.append(entry)

        await self.session.commit()

        # Refresh all entries
        for entry in new_entries:
            await self.session.refresh(entry)

        return new_entries

    async def get_csv_preview(
        self,
        competition_file: CompetitionFile,
        max_rows: int = 20,
    ) -> PreviewResult:
        """Get a preview of a CSV file.

        Args:
            competition_file: The file to preview
            max_rows: Maximum number of rows to return

        Returns:
            PreviewResult with columns, rows, and metadata

        Raises:
            ValueError: If file is not a CSV or cannot be parsed
        """
        # Check if file is a CSV
        if not competition_file.filename.lower().endswith(".csv"):
            raise ValueError("File is not a CSV")

        # Load file content
        storage_key = self._extract_storage_key(competition_file.file_path)
        content = await self.storage.load(storage_key)

        # Decode content
        try:
            text_content = content.decode("utf-8")
        except UnicodeDecodeError:
            try:
                text_content = content.decode("latin-1")
            except UnicodeDecodeError:
                raise ValueError("File encoding not supported")

        # Parse CSV
        try:
            reader = csv.DictReader(io.StringIO(text_content))
            columns = reader.fieldnames or []

            rows = []
            total_rows = 0
            for row in reader:
                total_rows += 1
                if len(rows) < max_rows:
                    rows.append(row)

            return PreviewResult(
                columns=columns,
                rows=rows,
                total_rows=total_rows,
                truncated=total_rows > max_rows,
            )
        except csv.Error as e:
            raise ValueError(f"Failed to parse CSV: {str(e)}")

    async def detect_columns(
        self,
        competition_file: CompetitionFile,
        sample_rows: int = 100,
    ) -> list[ColumnInfo]:
        """Detect columns and basic statistics from a CSV file.

        Args:
            competition_file: The file to analyze
            sample_rows: Number of rows to sample for analysis

        Returns:
            List of ColumnInfo with column metadata
        """
        # Check if file is a CSV
        if not competition_file.filename.lower().endswith(".csv"):
            raise ValueError("File is not a CSV")

        # Load file content
        storage_key = self._extract_storage_key(competition_file.file_path)
        content = await self.storage.load(storage_key)

        # Decode content
        try:
            text_content = content.decode("utf-8")
        except UnicodeDecodeError:
            text_content = content.decode("latin-1")

        # Parse CSV
        reader = csv.DictReader(io.StringIO(text_content))
        columns = reader.fieldnames or []

        # Collect sample data for each column
        column_values: dict[str, list[str]] = {col: [] for col in columns}

        for i, row in enumerate(reader):
            if i >= sample_rows:
                break
            for col in columns:
                column_values[col].append(row.get(col, ""))

        # Analyze each column
        result = []
        for col in columns:
            values = column_values[col]
            non_null = [v for v in values if v.strip()]
            unique_values_set = set(non_null)
            unique_count = len(unique_values_set)

            # Detect dtype
            dtype = self._detect_dtype(non_null)

            # Get sample values (first 5 unique) for display
            sample = list(unique_values_set)[:5]

            # Get all unique values for encoding suggestion (if <= 6)
            unique_values_list = list(unique_values_set) if unique_count <= 6 else []

            # Get suggestions based on column name and data
            suggestion = get_column_suggestion(
                column_name=col,
                dtype=dtype,
                unique_count=unique_count,
                unique_values=unique_values_list,
            )

            result.append(
                ColumnInfo(
                    name=col,
                    dtype=dtype,
                    sample_values=sample,
                    null_count=len(values) - len(non_null),
                    unique_count=unique_count,
                    suggested_definition=suggestion.definition,
                    suggested_encoding=suggestion.encoding,
                    suggestion_confidence=suggestion.confidence,
                )
            )

        return result

    def _detect_dtype(self, values: list[str]) -> str:
        """Detect the data type of a column based on sample values."""
        if not values:
            return "unknown"

        # Try to detect numeric types
        int_count = 0
        float_count = 0

        import math
        for v in values[:50]:  # Sample first 50
            try:
                float_val = float(v)
                # Skip infinity and NaN values
                if math.isinf(float_val) or math.isnan(float_val):
                    float_count += 1
                elif float_val == int(float_val):
                    int_count += 1
                else:
                    float_count += 1
            except (ValueError, OverflowError):
                # Not a number or overflow
                pass

        total_numeric = int_count + float_count
        if total_numeric == len(values[:50]):
            # All values are numeric
            if float_count > 0:
                return "float"
            else:
                # Check if binary
                unique = set(values)
                if unique <= {"0", "1", ""}:
                    return "binary"
                return "int"

        # Check for boolean-like values
        unique_lower = {v.lower() for v in values}
        if unique_lower <= {"true", "false", "yes", "no", "0", "1", ""}:
            return "bool"

        return "string"

    def _extract_storage_key(self, file_path: str) -> str:
        """Extract storage key from full file path."""
        markers = ["competition_files/"]
        for marker in markers:
            if marker in file_path:
                idx = file_path.index(marker)
                return file_path[idx:]
        return file_path
