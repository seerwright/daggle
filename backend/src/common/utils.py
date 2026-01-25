"""Common utility functions."""

import re
import unicodedata


def slugify(text: str) -> str:
    """Convert text to URL-friendly slug.

    Examples:
        "My Competition Name" -> "my-competition-name"
        "Test #1: Special Characters!" -> "test-1-special-characters"
    """
    # Normalize unicode characters
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")

    # Convert to lowercase
    text = text.lower()

    # Replace spaces and underscores with hyphens
    text = re.sub(r"[\s_]+", "-", text)

    # Remove non-alphanumeric characters (except hyphens)
    text = re.sub(r"[^a-z0-9-]", "", text)

    # Remove multiple consecutive hyphens
    text = re.sub(r"-+", "-", text)

    # Strip leading/trailing hyphens
    text = text.strip("-")

    return text
