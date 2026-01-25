"""Scoring metrics for competition evaluation."""

import math
from typing import Sequence


def calculate_auc_roc(
    predictions: Sequence[float],
    actuals: Sequence[int],
) -> float:
    """
    Calculate Area Under the ROC Curve (AUC-ROC).

    Args:
        predictions: Predicted probabilities (0 to 1)
        actuals: Actual binary labels (0 or 1)

    Returns:
        AUC-ROC score between 0 and 1
    """
    if len(predictions) != len(actuals):
        raise ValueError("Predictions and actuals must have the same length")

    if len(predictions) == 0:
        raise ValueError("Cannot calculate AUC-ROC for empty arrays")

    # Pair predictions with actuals and sort by prediction descending
    paired = sorted(zip(predictions, actuals), key=lambda x: -x[0])

    # Count positives and negatives
    n_pos = sum(actuals)
    n_neg = len(actuals) - n_pos

    if n_pos == 0 or n_neg == 0:
        raise ValueError("AUC-ROC requires both positive and negative samples")

    # Calculate AUC using the Mann-Whitney U statistic approach
    # Count pairs where positive sample has higher prediction than negative
    auc = 0.0
    cum_pos = 0

    for pred, actual in paired:
        if actual == 1:
            cum_pos += 1
        else:
            auc += cum_pos

    auc /= (n_pos * n_neg)
    return round(auc, 6)


def calculate_rmse(
    predictions: Sequence[float],
    actuals: Sequence[float],
) -> float:
    """
    Calculate Root Mean Squared Error (RMSE).

    Args:
        predictions: Predicted values
        actuals: Actual values

    Returns:
        RMSE score (lower is better)
    """
    if len(predictions) != len(actuals):
        raise ValueError("Predictions and actuals must have the same length")

    if len(predictions) == 0:
        raise ValueError("Cannot calculate RMSE for empty arrays")

    squared_errors = [(p - a) ** 2 for p, a in zip(predictions, actuals)]
    mse = sum(squared_errors) / len(squared_errors)
    return round(math.sqrt(mse), 6)


def calculate_mae(
    predictions: Sequence[float],
    actuals: Sequence[float],
) -> float:
    """
    Calculate Mean Absolute Error (MAE).

    Args:
        predictions: Predicted values
        actuals: Actual values

    Returns:
        MAE score (lower is better)
    """
    if len(predictions) != len(actuals):
        raise ValueError("Predictions and actuals must have the same length")

    if len(predictions) == 0:
        raise ValueError("Cannot calculate MAE for empty arrays")

    absolute_errors = [abs(p - a) for p, a in zip(predictions, actuals)]
    return round(sum(absolute_errors) / len(absolute_errors), 6)


def calculate_accuracy(
    predictions: Sequence[int],
    actuals: Sequence[int],
) -> float:
    """
    Calculate classification accuracy.

    Args:
        predictions: Predicted class labels
        actuals: Actual class labels

    Returns:
        Accuracy score between 0 and 1
    """
    if len(predictions) != len(actuals):
        raise ValueError("Predictions and actuals must have the same length")

    if len(predictions) == 0:
        raise ValueError("Cannot calculate accuracy for empty arrays")

    correct = sum(1 for p, a in zip(predictions, actuals) if p == a)
    return round(correct / len(predictions), 6)


def calculate_f1(
    predictions: Sequence[int],
    actuals: Sequence[int],
) -> float:
    """
    Calculate F1 score for binary classification.

    Args:
        predictions: Predicted binary labels (0 or 1)
        actuals: Actual binary labels (0 or 1)

    Returns:
        F1 score between 0 and 1
    """
    if len(predictions) != len(actuals):
        raise ValueError("Predictions and actuals must have the same length")

    if len(predictions) == 0:
        raise ValueError("Cannot calculate F1 for empty arrays")

    # Calculate TP, FP, FN
    tp = sum(1 for p, a in zip(predictions, actuals) if p == 1 and a == 1)
    fp = sum(1 for p, a in zip(predictions, actuals) if p == 1 and a == 0)
    fn = sum(1 for p, a in zip(predictions, actuals) if p == 0 and a == 1)

    if tp == 0:
        return 0.0

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0

    if precision + recall == 0:
        return 0.0

    f1 = 2 * (precision * recall) / (precision + recall)
    return round(f1, 6)


# Mapping of metric names to functions
METRIC_FUNCTIONS = {
    "auc_roc": calculate_auc_roc,
    "auc-roc": calculate_auc_roc,
    "roc_auc": calculate_auc_roc,
    "rmse": calculate_rmse,
    "mae": calculate_mae,
    "accuracy": calculate_accuracy,
    "f1": calculate_f1,
    "f1_score": calculate_f1,
}

# Metrics where lower is better
LOWER_IS_BETTER = {"rmse", "mae"}


def get_metric_function(metric_name: str):
    """Get the scoring function for a metric name."""
    normalized = metric_name.lower().replace("-", "_")
    if normalized not in METRIC_FUNCTIONS:
        raise ValueError(f"Unknown metric: {metric_name}")
    return METRIC_FUNCTIONS[normalized]


def is_lower_better(metric_name: str) -> bool:
    """Check if lower scores are better for this metric."""
    normalized = metric_name.lower().replace("-", "_")
    return normalized in LOWER_IS_BETTER
