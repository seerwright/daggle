"""Unit tests for submission validation."""

import pytest

from src.domain.scoring.validation import (
    ValidationResult,
    ValidationError,
    validate_submission,
    load_solution_file,
)


class TestValidateSubmission:
    """Tests for CSV validation."""

    def test_valid_csv_passes(self):
        """Valid CSV should pass validation."""
        content = "id,prediction\n1,0.5\n2,0.7\n3,0.3"

        result = validate_submission(content)

        assert result.valid is True
        assert len(result.errors) == 0
        assert result.row_count == 3

    def test_valid_csv_with_expected_ids(self):
        """Valid CSV matching expected IDs should pass."""
        content = "id,prediction\n1,0.5\n2,0.7"
        expected_ids = ["1", "2"]

        result = validate_submission(content, expected_ids=expected_ids)

        assert result.valid is True
        assert result.data["id"] == ["1", "2"]
        assert result.data["prediction"] == [0.5, 0.7]

    def test_missing_id_column_fails(self):
        """Missing ID column should fail validation."""
        content = "idx,prediction\n1,0.5"

        result = validate_submission(content)

        assert result.valid is False
        assert any(e.code == "MISSING_COLUMN" for e in result.errors)

    def test_missing_prediction_column_fails(self):
        """Missing prediction column should fail validation."""
        content = "id,prob\n1,0.5"

        result = validate_submission(content)

        assert result.valid is False
        assert any(e.code == "MISSING_COLUMN" for e in result.errors)

    def test_duplicate_ids_fail(self):
        """Duplicate IDs should fail validation."""
        content = "id,prediction\n1,0.5\n1,0.7"

        result = validate_submission(content)

        assert result.valid is False
        assert any(e.code == "DUPLICATE_ID" for e in result.errors)

    def test_empty_id_fails(self):
        """Empty ID value should fail validation."""
        content = "id,prediction\n,0.5\n2,0.7"

        result = validate_submission(content)

        assert result.valid is False
        assert any(e.code == "EMPTY_ID" for e in result.errors)

    def test_empty_prediction_fails(self):
        """Empty prediction value should fail validation."""
        content = "id,prediction\n1,\n2,0.7"

        result = validate_submission(content)

        assert result.valid is False
        assert any(e.code == "EMPTY_VALUE" for e in result.errors)

    def test_invalid_float_fails(self):
        """Non-numeric prediction should fail validation."""
        content = "id,prediction\n1,abc\n2,0.7"

        result = validate_submission(content)

        assert result.valid is False
        assert any(e.code == "INVALID_VALUE" for e in result.errors)

    def test_value_below_min_fails(self):
        """Value below minimum should fail validation."""
        content = "id,prediction\n1,-0.5\n2,0.7"

        result = validate_submission(content, value_min=0.0)

        assert result.valid is False
        assert any(e.code == "VALUE_OUT_OF_RANGE" for e in result.errors)

    def test_value_above_max_fails(self):
        """Value above maximum should fail validation."""
        content = "id,prediction\n1,1.5\n2,0.7"

        result = validate_submission(content, value_max=1.0)

        assert result.valid is False
        assert any(e.code == "VALUE_OUT_OF_RANGE" for e in result.errors)

    def test_binary_non_binary_value_fails(self):
        """Non-binary value with binary type should fail."""
        content = "id,prediction\n1,2\n2,1"

        result = validate_submission(content, value_type="binary")

        assert result.valid is False
        assert any(e.code == "INVALID_BINARY" for e in result.errors)

    def test_binary_valid_values_pass(self):
        """Valid binary values should pass."""
        content = "id,prediction\n1,0\n2,1"

        result = validate_submission(content, value_type="binary")

        assert result.valid is True

    def test_missing_expected_ids_fails(self):
        """Missing expected IDs should fail validation."""
        content = "id,prediction\n1,0.5"
        expected_ids = ["1", "2", "3"]

        result = validate_submission(content, expected_ids=expected_ids)

        assert result.valid is False
        assert any(e.code == "MISSING_IDS" for e in result.errors)

    def test_extra_ids_fails(self):
        """Extra unexpected IDs should fail validation."""
        content = "id,prediction\n1,0.5\n2,0.7\n3,0.3"
        expected_ids = ["1"]

        result = validate_submission(content, expected_ids=expected_ids)

        assert result.valid is False
        assert any(e.code == "EXTRA_IDS" for e in result.errors)

    def test_empty_file_fails(self):
        """Empty file (no data rows) should fail."""
        content = "id,prediction"

        result = validate_submission(content)

        assert result.valid is False
        assert any(e.code == "EMPTY_FILE" for e in result.errors)

    def test_handles_bytes_input(self):
        """Should handle bytes input."""
        content = b"id,prediction\n1,0.5\n2,0.7"

        result = validate_submission(content)

        assert result.valid is True

    def test_custom_column_names(self):
        """Should support custom column names."""
        content = "customer_id,churn_prob\n1,0.5\n2,0.7"

        result = validate_submission(
            content,
            id_column="customer_id",
            prediction_column="churn_prob",
        )

        assert result.valid is True


class TestLoadSolutionFile:
    """Tests for solution file loading."""

    def test_load_valid_solution(self):
        """Should load valid solution file into dict."""
        content = "id,target\n1,1\n2,0\n3,1"

        solution = load_solution_file(content)

        assert solution == {"1": 1.0, "2": 0.0, "3": 1.0}

    def test_load_invalid_solution_raises(self):
        """Should raise ValueError for invalid solution file."""
        content = "id,wrong_column\n1,1"

        with pytest.raises(ValueError, match="Invalid solution file"):
            load_solution_file(content)
