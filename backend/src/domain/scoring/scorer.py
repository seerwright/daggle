"""Submission scorer - validates and scores submissions against ground truth."""

from dataclasses import dataclass
from pathlib import Path

from src.domain.scoring.metrics import get_metric_function, is_lower_better
from src.domain.scoring.validation import (
    ValidationResult,
    ValidationError,
    validate_submission,
    load_solution_file,
)


@dataclass
class ScoringResult:
    """Result of scoring a submission."""

    success: bool
    score: float | None = None
    validation_result: ValidationResult | None = None
    error_message: str | None = None


class Scorer:
    """Scores submissions against a solution file."""

    def __init__(
        self,
        solution_path: str | Path,
        metric: str,
        id_column: str = "id",
        prediction_column: str = "prediction",
        target_column: str = "target",
        value_min: float | None = None,
        value_max: float | None = None,
        value_type: str = "float",
    ):
        """
        Initialize the scorer.

        Args:
            solution_path: Path to the solution/ground truth CSV file
            metric: Name of the scoring metric (e.g., "auc_roc", "rmse")
            id_column: Name of the ID column in both files
            prediction_column: Name of the prediction column in submissions
            target_column: Name of the target column in solution file
            value_min: Minimum allowed prediction value
            value_max: Maximum allowed prediction value
            value_type: Type of prediction values ("float", "int", "binary")
        """
        self.solution_path = Path(solution_path)
        self.metric = metric
        self.id_column = id_column
        self.prediction_column = prediction_column
        self.target_column = target_column
        self.value_min = value_min
        self.value_max = value_max
        self.value_type = value_type

        # Load solution file
        self._solution: dict[str, float] | None = None
        self._metric_fn = get_metric_function(metric)

    def _load_solution(self) -> dict[str, float]:
        """Load solution file on first use."""
        if self._solution is None:
            if not self.solution_path.exists():
                raise FileNotFoundError(
                    f"Solution file not found: {self.solution_path}"
                )

            with open(self.solution_path, "r") as f:
                content = f.read()

            self._solution = load_solution_file(
                content,
                id_column=self.id_column,
                target_column=self.target_column,
            )

        return self._solution

    def score(self, submission_content: str | bytes) -> ScoringResult:
        """
        Validate and score a submission.

        Args:
            submission_content: Content of the submission CSV file

        Returns:
            ScoringResult with score or error information
        """
        try:
            solution = self._load_solution()
        except (FileNotFoundError, ValueError) as e:
            return ScoringResult(
                success=False,
                error_message=f"Solution file error: {str(e)}",
            )

        # Get expected IDs from solution
        expected_ids = list(solution.keys())

        # Validate submission
        validation = validate_submission(
            submission_content,
            id_column=self.id_column,
            prediction_column=self.prediction_column,
            expected_ids=expected_ids,
            value_min=self.value_min,
            value_max=self.value_max,
            value_type=self.value_type,
        )

        if not validation.valid:
            # Format error messages
            error_messages = [e.message for e in validation.errors[:5]]
            if len(validation.errors) > 5:
                error_messages.append(
                    f"... and {len(validation.errors) - 5} more errors"
                )

            return ScoringResult(
                success=False,
                validation_result=validation,
                error_message="; ".join(error_messages),
            )

        # Extract predictions in solution order
        submission_ids = validation.data[self.id_column]
        submission_preds = validation.data[self.prediction_column]

        # Create lookup for predictions
        pred_lookup = dict(zip(submission_ids, submission_preds))

        # Align predictions with solution order
        predictions = []
        actuals = []

        for row_id, actual in solution.items():
            if row_id in pred_lookup:
                predictions.append(pred_lookup[row_id])
                actuals.append(actual)

        # Calculate score
        try:
            score = self._metric_fn(predictions, actuals)
        except ValueError as e:
            return ScoringResult(
                success=False,
                error_message=f"Scoring error: {str(e)}",
            )

        return ScoringResult(
            success=True,
            score=score,
            validation_result=validation,
        )

    def is_lower_better(self) -> bool:
        """Check if lower scores are better for this metric."""
        return is_lower_better(self.metric)


def create_scorer_for_competition(
    competition,
    solution_path: str | Path | None = None,
) -> Scorer | None:
    """
    Create a scorer for a competition.

    Args:
        competition: Competition model instance
        solution_path: Override path to solution file (uses competition.solution_path if None)

    Returns:
        Scorer instance or None if no solution file is available
    """
    path = solution_path or getattr(competition, "solution_path", None)

    if not path:
        return None

    # Determine value constraints based on metric
    metric = competition.evaluation_metric.lower().replace("-", "_")

    # Common metric configurations
    metric_configs = {
        "auc_roc": {"value_min": 0.0, "value_max": 1.0, "value_type": "float"},
        "roc_auc": {"value_min": 0.0, "value_max": 1.0, "value_type": "float"},
        "accuracy": {"value_type": "int"},
        "f1": {"value_type": "binary"},
        "rmse": {"value_type": "float"},
        "mae": {"value_type": "float"},
    }

    config = metric_configs.get(metric, {"value_type": "float"})

    return Scorer(
        solution_path=path,
        metric=metric,
        **config,
    )
