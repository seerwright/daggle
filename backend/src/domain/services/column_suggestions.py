"""Column name parser and suggestion utility.

Provides smart suggestions for data dictionary entries based on column names,
data types, and common patterns in data science datasets.
"""

import re
from dataclasses import dataclass


@dataclass
class ColumnSuggestion:
    """Suggestion for a column's definition and encoding."""

    definition: str | None = None
    encoding: str | None = None
    confidence: str = "low"  # low, medium, high


# Common column name patterns and their suggested definitions
COLUMN_PATTERNS: list[tuple[str, str, str]] = [
    # Identifier patterns
    (r"^id$", "Unique row identifier", "high"),
    (r"_id$", "Unique identifier for {entity}", "high"),
    (r"^uuid$", "Universally unique identifier", "high"),
    (r"^index$", "Row index", "medium"),

    # Target/label patterns (common in ML datasets)
    (r"^target$", "Prediction target variable", "high"),
    (r"^label$", "Class label for classification", "high"),
    (r"^y$", "Target variable", "medium"),
    (r"^class$", "Class label", "medium"),
    (r"^outcome$", "Outcome variable", "medium"),

    # Boolean patterns
    (r"^is_", "Indicates whether {description}", "high"),
    (r"^has_", "Indicates presence of {description}", "high"),
    (r"^was_", "Indicates past state of {description}", "high"),
    (r"^can_", "Indicates capability for {description}", "medium"),
    (r"^should_", "Indicates recommendation for {description}", "medium"),
    (r"^will_", "Indicates future state of {description}", "medium"),
    (r"^flag_", "Flag indicating {description}", "medium"),

    # Date/time patterns
    (r"_at$", "Timestamp of when {event} occurred", "high"),
    (r"_date$", "Date of {event}", "high"),
    (r"_time$", "Time of {event}", "high"),
    (r"^date$", "Date value", "medium"),
    (r"^timestamp$", "Timestamp value", "high"),
    (r"^datetime$", "Date and time value", "high"),
    (r"^created_", "Timestamp of creation", "medium"),
    (r"^updated_", "Timestamp of last update", "medium"),
    (r"^deleted_", "Timestamp of deletion", "medium"),

    # Count/quantity patterns
    (r"_count$", "Count of {items}", "high"),
    (r"_num$", "Number of {items}", "medium"),
    (r"^num_", "Number of {items}", "medium"),
    (r"^count_", "Count of {items}", "medium"),
    (r"^total_", "Total {items}", "medium"),
    (r"_total$", "Total {items}", "medium"),

    # Amount/value patterns
    (r"_amount$", "Amount of {item}", "medium"),
    (r"_value$", "Value of {item}", "medium"),
    (r"_price$", "Price of {item}", "high"),
    (r"_cost$", "Cost of {item}", "high"),
    (r"_rate$", "Rate of {item}", "medium"),
    (r"_ratio$", "Ratio of {item}", "medium"),
    (r"_pct$", "Percentage of {item}", "high"),
    (r"_percent$", "Percentage of {item}", "high"),
    (r"_percentage$", "Percentage of {item}", "high"),

    # Text/description patterns
    (r"_name$", "Name of {entity}", "high"),
    (r"^name$", "Name", "medium"),
    (r"_desc$", "Description of {item}", "medium"),
    (r"_description$", "Description of {item}", "high"),
    (r"_text$", "Text content of {item}", "medium"),
    (r"_comment$", "Comment about {item}", "medium"),
    (r"_note$", "Note about {item}", "medium"),
    (r"_notes$", "Notes about {item}", "medium"),

    # Contact patterns
    (r"^email$", "Email address", "high"),
    (r"_email$", "Email address for {entity}", "high"),
    (r"^phone$", "Phone number", "high"),
    (r"_phone$", "Phone number for {entity}", "high"),
    (r"^address$", "Physical address", "medium"),
    (r"_address$", "Address for {entity}", "medium"),

    # Location patterns
    (r"^city$", "City name", "high"),
    (r"^state$", "State or province", "medium"),
    (r"^country$", "Country name", "high"),
    (r"^zip$", "ZIP or postal code", "high"),
    (r"^zipcode$", "ZIP or postal code", "high"),
    (r"^postal_code$", "Postal code", "high"),
    (r"^latitude$", "Geographic latitude", "high"),
    (r"^lat$", "Geographic latitude", "medium"),
    (r"^longitude$", "Geographic longitude", "high"),
    (r"^lng$", "Geographic longitude", "medium"),
    (r"^lon$", "Geographic longitude", "medium"),

    # Status patterns
    (r"^status$", "Current status", "medium"),
    (r"_status$", "Status of {entity}", "medium"),
    (r"^type$", "Type or category", "medium"),
    (r"_type$", "Type of {entity}", "medium"),
    (r"^category$", "Category classification", "medium"),
    (r"_category$", "Category of {entity}", "medium"),

    # User patterns
    (r"^user_", "User-related {attribute}", "medium"),
    (r"^customer_", "Customer-related {attribute}", "medium"),
    (r"^member_", "Member-related {attribute}", "medium"),
    (r"^account_", "Account-related {attribute}", "medium"),

    # Score/rating patterns
    (r"_score$", "Score for {item}", "high"),
    (r"^score$", "Score value", "medium"),
    (r"_rating$", "Rating for {item}", "high"),
    (r"^rating$", "Rating value", "medium"),
    (r"_rank$", "Rank of {item}", "medium"),

    # Size/dimension patterns
    (r"_size$", "Size of {item}", "medium"),
    (r"^size$", "Size value", "medium"),
    (r"_length$", "Length of {item}", "medium"),
    (r"_width$", "Width of {item}", "medium"),
    (r"_height$", "Height of {item}", "medium"),
    (r"_weight$", "Weight of {item}", "medium"),
    (r"_area$", "Area of {item}", "medium"),
    (r"_volume$", "Volume of {item}", "medium"),

    # Duration patterns
    (r"_duration$", "Duration of {event}", "high"),
    (r"_seconds$", "Duration in seconds", "high"),
    (r"_minutes$", "Duration in minutes", "high"),
    (r"_hours$", "Duration in hours", "high"),
    (r"_days$", "Duration in days", "high"),

    # Age patterns
    (r"^age$", "Age in years", "high"),
    (r"_age$", "Age of {entity}", "medium"),
]


def parse_column_name(column_name: str) -> list[str]:
    """Parse a column name into component words.

    Handles various naming conventions:
    - snake_case: user_first_name -> ['user', 'first', 'name']
    - camelCase: userFirstName -> ['user', 'first', 'name']
    - kebab-case: user-first-name -> ['user', 'first', 'name']
    """
    # Replace hyphens and spaces with underscores
    name = column_name.replace("-", "_").replace(" ", "_")

    # Split camelCase
    name = re.sub(r"([a-z])([A-Z])", r"\1_\2", name)

    # Split on underscores and filter empty strings
    parts = [p.lower() for p in name.split("_") if p]

    return parts


def format_description(template: str, column_name: str) -> str:
    """Format a description template with extracted information from column name.

    Replaces placeholders like {entity}, {description}, {items}, {event}, {item}
    with human-readable versions of the column name parts.
    """
    parts = parse_column_name(column_name)

    # Remove common suffixes/prefixes that are already described
    filter_words = {"id", "at", "date", "time", "count", "num", "is", "has", "was", "flag"}
    meaningful_parts = [p for p in parts if p.lower() not in filter_words]

    # Create human-readable version
    if meaningful_parts:
        readable = " ".join(meaningful_parts)
    else:
        readable = " ".join(parts)

    # Replace various placeholders with the readable name
    for placeholder in ["{entity}", "{description}", "{items}", "{event}", "{item}", "{attribute}"]:
        template = template.replace(placeholder, readable)

    return template


def suggest_encoding_from_dtype(dtype: str, unique_count: int, sample_values: list[str]) -> str | None:
    """Suggest encoding description based on data type and values."""
    if dtype == "binary":
        return "0 = No, 1 = Yes"

    if dtype == "bool":
        # Check actual values to determine encoding
        lower_values = {v.lower() for v in sample_values if v}
        if "true" in lower_values or "false" in lower_values:
            return "true = Yes, false = No"
        if "yes" in lower_values or "no" in lower_values:
            return "yes = Yes, no = No"
        return "0 = No, 1 = Yes"

    # For low-cardinality categorical variables, list the values
    if dtype == "string" and unique_count <= 10 and unique_count > 0:
        if len(sample_values) <= 5:
            values_str = ", ".join(sorted(sample_values))
            return f"Possible values: {values_str}"

    return None


def get_column_suggestion(
    column_name: str,
    dtype: str = "unknown",
    unique_count: int = 0,
    sample_values: list[str] | None = None,
) -> ColumnSuggestion:
    """Get suggestion for a column based on its name and properties.

    Args:
        column_name: The column name to analyze
        dtype: Detected data type (int, float, string, bool, binary)
        unique_count: Number of unique values in the column
        sample_values: Sample values from the column

    Returns:
        ColumnSuggestion with definition and encoding suggestions
    """
    sample_values = sample_values or []
    column_lower = column_name.lower()

    # Try pattern matching
    for pattern, template, confidence in COLUMN_PATTERNS:
        if re.search(pattern, column_lower):
            definition = format_description(template, column_name)
            encoding = suggest_encoding_from_dtype(dtype, unique_count, sample_values)
            return ColumnSuggestion(
                definition=definition,
                encoding=encoding,
                confidence=confidence,
            )

    # Fallback: try to create a readable description from the column name
    parts = parse_column_name(column_name)
    if parts:
        readable = " ".join(parts).title()
        encoding = suggest_encoding_from_dtype(dtype, unique_count, sample_values)
        return ColumnSuggestion(
            definition=readable,
            encoding=encoding,
            confidence="low",
        )

    return ColumnSuggestion()
