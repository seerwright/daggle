"""CSV submission validation."""

import csv
import io
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ValidationError:
    """A single validation error."""

    code: str
    message: str
    field: str | None = None
    row: int | None = None


@dataclass
class ValidationResult:
    """Result of validating a submission file."""

    valid: bool
    errors: list[ValidationError] = field(default_factory=list)
    data: dict[str, list[Any]] = field(default_factory=dict)
    row_count: int = 0


def validate_submission(
    content: str | bytes,
    id_column: str = "id",
    prediction_column: str = "prediction",
    expected_ids: list[str] | None = None,
    value_min: float | None = None,
    value_max: float | None = None,
    value_type: str = "float",  # "float", "int", "binary"
) -> ValidationResult:
    """
    Validate a submission CSV file.

    Args:
        content: CSV file content as string or bytes
        id_column: Name of the ID column
        prediction_column: Name of the prediction column
        expected_ids: List of expected IDs (if provided, will check for missing/extra)
        value_min: Minimum allowed value for predictions
        value_max: Maximum allowed value for predictions
        value_type: Type of prediction values ("float", "int", "binary")

    Returns:
        ValidationResult with validation status, errors, and parsed data
    """
    errors: list[ValidationError] = []
    data: dict[str, list[Any]] = {id_column: [], prediction_column: []}

    # Convert bytes to string if needed
    if isinstance(content, bytes):
        try:
            content = content.decode("utf-8")
        except UnicodeDecodeError:
            try:
                content = content.decode("latin-1")
            except UnicodeDecodeError:
                return ValidationResult(
                    valid=False,
                    errors=[
                        ValidationError(
                            code="ENCODING_ERROR",
                            message="File encoding not supported. Use UTF-8.",
                        )
                    ],
                )

    # Parse CSV
    try:
        reader = csv.DictReader(io.StringIO(content))
        headers = reader.fieldnames or []
    except csv.Error as e:
        return ValidationResult(
            valid=False,
            errors=[
                ValidationError(
                    code="CSV_PARSE_ERROR",
                    message=f"Failed to parse CSV: {str(e)}",
                )
            ],
        )

    # Check required columns
    if id_column not in headers:
        errors.append(
            ValidationError(
                code="MISSING_COLUMN",
                message=f"Missing required column: {id_column}",
                field=id_column,
            )
        )

    if prediction_column not in headers:
        errors.append(
            ValidationError(
                code="MISSING_COLUMN",
                message=f"Missing required column: {prediction_column}",
                field=prediction_column,
            )
        )

    if errors:
        return ValidationResult(valid=False, errors=errors)

    # Parse rows
    seen_ids: set[str] = set()
    row_count = 0

    for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
        row_count += 1

        # Get ID
        row_id = row.get(id_column, "").strip()
        if not row_id:
            errors.append(
                ValidationError(
                    code="EMPTY_ID",
                    message="Empty ID value",
                    field=id_column,
                    row=row_num,
                )
            )
            continue

        # Check for duplicate IDs
        if row_id in seen_ids:
            errors.append(
                ValidationError(
                    code="DUPLICATE_ID",
                    message=f"Duplicate ID: {row_id}",
                    field=id_column,
                    row=row_num,
                )
            )
        seen_ids.add(row_id)

        # Get and validate prediction value
        pred_str = row.get(prediction_column, "").strip()
        if not pred_str:
            errors.append(
                ValidationError(
                    code="EMPTY_VALUE",
                    message="Empty prediction value",
                    field=prediction_column,
                    row=row_num,
                )
            )
            continue

        # Parse value based on type
        try:
            if value_type == "int" or value_type == "binary":
                pred_value = int(float(pred_str))
            else:
                pred_value = float(pred_str)
        except ValueError:
            errors.append(
                ValidationError(
                    code="INVALID_VALUE",
                    message=f"Invalid {value_type} value: {pred_str}",
                    field=prediction_column,
                    row=row_num,
                )
            )
            continue

        # Check value range
        if value_min is not None and pred_value < value_min:
            errors.append(
                ValidationError(
                    code="VALUE_OUT_OF_RANGE",
                    message=f"Value {pred_value} is below minimum {value_min}",
                    field=prediction_column,
                    row=row_num,
                )
            )
        if value_max is not None and pred_value > value_max:
            errors.append(
                ValidationError(
                    code="VALUE_OUT_OF_RANGE",
                    message=f"Value {pred_value} is above maximum {value_max}",
                    field=prediction_column,
                    row=row_num,
                )
            )

        # Check binary constraint
        if value_type == "binary" and pred_value not in (0, 1):
            errors.append(
                ValidationError(
                    code="INVALID_BINARY",
                    message=f"Binary prediction must be 0 or 1, got {pred_value}",
                    field=prediction_column,
                    row=row_num,
                )
            )

        data[id_column].append(row_id)
        data[prediction_column].append(pred_value)

    # Check for missing/extra IDs if expected_ids provided
    if expected_ids is not None:
        expected_set = set(expected_ids)
        missing_ids = expected_set - seen_ids
        extra_ids = seen_ids - expected_set

        if missing_ids:
            sample = list(missing_ids)[:5]
            errors.append(
                ValidationError(
                    code="MISSING_IDS",
                    message=f"Missing {len(missing_ids)} expected IDs: {sample}{'...' if len(missing_ids) > 5 else ''}",
                    field=id_column,
                )
            )

        if extra_ids:
            sample = list(extra_ids)[:5]
            errors.append(
                ValidationError(
                    code="EXTRA_IDS",
                    message=f"Found {len(extra_ids)} unexpected IDs: {sample}{'...' if len(extra_ids) > 5 else ''}",
                    field=id_column,
                )
            )

    # Check row count
    if row_count == 0:
        errors.append(
            ValidationError(
                code="EMPTY_FILE",
                message="File contains no data rows",
            )
        )

    return ValidationResult(
        valid=len(errors) == 0,
        errors=errors,
        data=data,
        row_count=row_count,
    )


def load_solution_file(
    content: str | bytes,
    id_column: str = "id",
    target_column: str = "target",
) -> dict[str, float]:
    """
    Load a solution file into a dictionary mapping IDs to target values.

    Args:
        content: CSV file content
        id_column: Name of the ID column
        target_column: Name of the target/label column

    Returns:
        Dictionary mapping ID strings to target values
    """
    result = validate_submission(
        content,
        id_column=id_column,
        prediction_column=target_column,
        value_type="float",
    )

    if not result.valid:
        raise ValueError(f"Invalid solution file: {result.errors[0].message}")

    return dict(zip(result.data[id_column], result.data[target_column]))
