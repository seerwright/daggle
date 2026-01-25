"""Unit tests for scoring metrics."""

import pytest

from src.domain.scoring.metrics import (
    calculate_auc_roc,
    calculate_rmse,
    calculate_mae,
    calculate_accuracy,
    calculate_f1,
    get_metric_function,
    is_lower_better,
)


class TestAucRoc:
    """Tests for AUC-ROC calculation."""

    def test_perfect_predictions_returns_one(self):
        """Perfect separation should return AUC = 1.0."""
        predictions = [0.9, 0.8, 0.2, 0.1]
        actuals = [1, 1, 0, 0]

        score = calculate_auc_roc(predictions, actuals)
        assert score == 1.0

    def test_inverse_predictions_returns_zero(self):
        """Completely wrong predictions should return AUC = 0.0."""
        predictions = [0.1, 0.2, 0.8, 0.9]
        actuals = [1, 1, 0, 0]

        score = calculate_auc_roc(predictions, actuals)
        assert score == 0.0

    def test_mediocre_predictions_returns_middle_score(self):
        """Partially predictive model should score between 0.5 and 1.0."""
        # Mixed predictions - one positive has lower score than one negative
        predictions = [0.8, 0.4, 0.6, 0.2]
        actuals = [1, 1, 0, 0]

        score = calculate_auc_roc(predictions, actuals)
        # Not perfect (0.4 < 0.6) but better than random
        assert 0.5 < score < 1.0

    def test_empty_arrays_raises_error(self):
        """Empty inputs should raise ValueError."""
        with pytest.raises(ValueError, match="empty"):
            calculate_auc_roc([], [])

    def test_mismatched_lengths_raises_error(self):
        """Mismatched array lengths should raise ValueError."""
        with pytest.raises(ValueError, match="same length"):
            calculate_auc_roc([0.5, 0.5], [1])

    def test_no_positive_samples_raises_error(self):
        """All negative samples should raise ValueError."""
        with pytest.raises(ValueError, match="positive and negative"):
            calculate_auc_roc([0.5, 0.5], [0, 0])

    def test_no_negative_samples_raises_error(self):
        """All positive samples should raise ValueError."""
        with pytest.raises(ValueError, match="positive and negative"):
            calculate_auc_roc([0.5, 0.5], [1, 1])


class TestRmse:
    """Tests for RMSE calculation."""

    def test_perfect_predictions_returns_zero(self):
        """Exact predictions should return RMSE = 0."""
        predictions = [1.0, 2.0, 3.0]
        actuals = [1.0, 2.0, 3.0]

        score = calculate_rmse(predictions, actuals)
        assert score == 0.0

    def test_known_values(self):
        """Test with known RMSE values."""
        predictions = [1.0, 2.0, 3.0]
        actuals = [1.0, 2.0, 4.0]

        # Error: 0, 0, 1 -> MSE = 1/3 -> RMSE = sqrt(1/3) ≈ 0.577
        score = calculate_rmse(predictions, actuals)
        assert 0.57 <= score <= 0.58

    def test_empty_arrays_raises_error(self):
        """Empty inputs should raise ValueError."""
        with pytest.raises(ValueError, match="empty"):
            calculate_rmse([], [])


class TestMae:
    """Tests for MAE calculation."""

    def test_perfect_predictions_returns_zero(self):
        """Exact predictions should return MAE = 0."""
        predictions = [1.0, 2.0, 3.0]
        actuals = [1.0, 2.0, 3.0]

        score = calculate_mae(predictions, actuals)
        assert score == 0.0

    def test_known_values(self):
        """Test with known MAE values."""
        predictions = [1.0, 2.0, 3.0]
        actuals = [2.0, 3.0, 5.0]

        # Errors: 1, 1, 2 -> MAE = 4/3 ≈ 1.333
        score = calculate_mae(predictions, actuals)
        assert 1.33 <= score <= 1.34


class TestAccuracy:
    """Tests for accuracy calculation."""

    def test_perfect_predictions(self):
        """All correct predictions should return 1.0."""
        predictions = [0, 1, 0, 1]
        actuals = [0, 1, 0, 1]

        score = calculate_accuracy(predictions, actuals)
        assert score == 1.0

    def test_all_wrong_predictions(self):
        """All wrong predictions should return 0.0."""
        predictions = [1, 0, 1, 0]
        actuals = [0, 1, 0, 1]

        score = calculate_accuracy(predictions, actuals)
        assert score == 0.0

    def test_half_correct(self):
        """Half correct should return 0.5."""
        predictions = [1, 1, 0, 0]
        actuals = [1, 0, 1, 0]

        score = calculate_accuracy(predictions, actuals)
        assert score == 0.5


class TestF1:
    """Tests for F1 score calculation."""

    def test_perfect_predictions(self):
        """Perfect predictions should return F1 = 1.0."""
        predictions = [1, 1, 0, 0]
        actuals = [1, 1, 0, 0]

        score = calculate_f1(predictions, actuals)
        assert score == 1.0

    def test_no_true_positives(self):
        """No true positives should return F1 = 0."""
        predictions = [0, 0, 0, 0]
        actuals = [1, 1, 0, 0]

        score = calculate_f1(predictions, actuals)
        assert score == 0.0

    def test_known_f1_value(self):
        """Test with known F1 value."""
        # TP=1, FP=1, FN=1
        # Precision = 1/2, Recall = 1/2
        # F1 = 2 * (0.5 * 0.5) / (0.5 + 0.5) = 0.5
        predictions = [1, 1, 0]
        actuals = [1, 0, 1]

        score = calculate_f1(predictions, actuals)
        assert score == 0.5


class TestMetricHelpers:
    """Tests for metric helper functions."""

    def test_get_metric_function_valid(self):
        """Should return correct function for valid metric names."""
        func = get_metric_function("auc_roc")
        assert func == calculate_auc_roc

        func = get_metric_function("rmse")
        assert func == calculate_rmse

    def test_get_metric_function_case_insensitive(self):
        """Should handle different cases."""
        func = get_metric_function("AUC_ROC")
        assert func == calculate_auc_roc

    def test_get_metric_function_invalid(self):
        """Should raise ValueError for unknown metric."""
        with pytest.raises(ValueError, match="Unknown metric"):
            get_metric_function("unknown_metric")

    def test_is_lower_better(self):
        """Should correctly identify lower-is-better metrics."""
        assert is_lower_better("rmse") is True
        assert is_lower_better("mae") is True
        assert is_lower_better("auc_roc") is False
        assert is_lower_better("accuracy") is False
