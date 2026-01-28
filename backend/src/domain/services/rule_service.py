"""Rule service for managing competition rules and templates."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.competition_rule import CompetitionRule
from src.domain.models.rule_template import RuleTemplate


# Predefined rule templates organized by category
PREDEFINED_TEMPLATES = [
    # Team Formation
    {
        "category": "Team Formation",
        "template_text": "Teams may have a maximum of {n} members",
        "has_parameter": True,
        "parameter_type": "number",
        "parameter_label": "Maximum team size",
        "display_order": 1,
    },
    {
        "category": "Team Formation",
        "template_text": "Team mergers are allowed until {date}",
        "has_parameter": True,
        "parameter_type": "date",
        "parameter_label": "Merger deadline",
        "display_order": 2,
    },
    {
        "category": "Team Formation",
        "template_text": "Participants may only belong to one team",
        "has_parameter": False,
        "parameter_type": None,
        "parameter_label": None,
        "display_order": 3,
    },
    {
        "category": "Team Formation",
        "template_text": "Team members cannot be changed after the competition starts",
        "has_parameter": False,
        "parameter_type": None,
        "parameter_label": None,
        "display_order": 4,
    },
    # Submissions
    {
        "category": "Submissions",
        "template_text": "Daily submission limit: {n} per day",
        "has_parameter": True,
        "parameter_type": "number",
        "parameter_label": "Submissions per day",
        "display_order": 10,
    },
    {
        "category": "Submissions",
        "template_text": "Submissions must include source code",
        "has_parameter": False,
        "parameter_type": None,
        "parameter_label": None,
        "display_order": 11,
    },
    {
        "category": "Submissions",
        "template_text": "External data is permitted if documented",
        "has_parameter": False,
        "parameter_type": None,
        "parameter_label": None,
        "display_order": 12,
    },
    {
        "category": "Submissions",
        "template_text": "Pre-trained models are allowed",
        "has_parameter": False,
        "parameter_type": None,
        "parameter_label": None,
        "display_order": 13,
    },
    {
        "category": "Submissions",
        "template_text": "Hand-labeling of test data is prohibited",
        "has_parameter": False,
        "parameter_type": None,
        "parameter_label": None,
        "display_order": 14,
    },
    # Scoring
    {
        "category": "Scoring",
        "template_text": "Final ranking uses private leaderboard scores",
        "has_parameter": False,
        "parameter_type": None,
        "parameter_label": None,
        "display_order": 20,
    },
    {
        "category": "Scoring",
        "template_text": "Ties are broken by earliest submission time",
        "has_parameter": False,
        "parameter_type": None,
        "parameter_label": None,
        "display_order": 21,
    },
    {
        "category": "Scoring",
        "template_text": "You may select {n} submissions for final scoring",
        "has_parameter": True,
        "parameter_type": "number",
        "parameter_label": "Number of final submissions",
        "display_order": 22,
    },
    # Conduct
    {
        "category": "Conduct",
        "template_text": "Share knowledge freely in discussions",
        "has_parameter": False,
        "parameter_type": None,
        "parameter_label": None,
        "display_order": 30,
    },
    {
        "category": "Conduct",
        "template_text": "Cite sources when using external code",
        "has_parameter": False,
        "parameter_type": None,
        "parameter_label": None,
        "display_order": 31,
    },
    {
        "category": "Conduct",
        "template_text": "Private sharing of code between teams is prohibited",
        "has_parameter": False,
        "parameter_type": None,
        "parameter_label": None,
        "display_order": 32,
    },
    {
        "category": "Conduct",
        "template_text": "Multiple accounts are not permitted",
        "has_parameter": False,
        "parameter_type": None,
        "parameter_label": None,
        "display_order": 33,
    },
]


class RuleService:
    """Service for managing competition rules."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def seed_templates(self) -> list[RuleTemplate]:
        """Seed predefined rule templates if they don't exist."""
        created = []
        for template_data in PREDEFINED_TEMPLATES:
            # Check if template already exists
            result = await self.db.execute(
                select(RuleTemplate).where(
                    RuleTemplate.template_text == template_data["template_text"]
                )
            )
            existing = result.scalar_one_or_none()

            if not existing:
                template = RuleTemplate(**template_data)
                self.db.add(template)
                created.append(template)

        if created:
            await self.db.commit()
            for t in created:
                await self.db.refresh(t)

        return created

    async def list_templates(self) -> list[RuleTemplate]:
        """Get all rule templates grouped by category."""
        result = await self.db.execute(
            select(RuleTemplate).order_by(
                RuleTemplate.category, RuleTemplate.display_order
            )
        )
        return list(result.scalars().all())

    async def get_template(self, template_id: int) -> RuleTemplate | None:
        """Get a specific rule template by ID."""
        result = await self.db.execute(
            select(RuleTemplate).where(RuleTemplate.id == template_id)
        )
        return result.scalar_one_or_none()

    async def list_competition_rules(
        self, competition_id: int, enabled_only: bool = False
    ) -> list[CompetitionRule]:
        """Get all rules for a competition."""
        query = select(CompetitionRule).where(
            CompetitionRule.competition_id == competition_id
        )
        if enabled_only:
            query = query.where(CompetitionRule.is_enabled == True)  # noqa: E712
        query = query.order_by(CompetitionRule.display_order)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_rule(self, rule_id: int) -> CompetitionRule | None:
        """Get a specific competition rule by ID."""
        result = await self.db.execute(
            select(CompetitionRule).where(CompetitionRule.id == rule_id)
        )
        return result.scalar_one_or_none()

    async def create_rule(
        self,
        competition_id: int,
        rule_template_id: int | None = None,
        parameter_value: str | None = None,
        custom_text: str | None = None,
        display_order: int = 0,
    ) -> CompetitionRule:
        """Create a new rule for a competition."""
        rule = CompetitionRule(
            competition_id=competition_id,
            rule_template_id=rule_template_id,
            parameter_value=parameter_value,
            custom_text=custom_text,
            display_order=display_order,
            is_enabled=True,
        )
        self.db.add(rule)
        await self.db.commit()
        await self.db.refresh(rule)
        return rule

    async def update_rule(
        self,
        rule: CompetitionRule,
        is_enabled: bool | None = None,
        parameter_value: str | None = None,
        custom_text: str | None = None,
        display_order: int | None = None,
    ) -> CompetitionRule:
        """Update an existing competition rule."""
        if is_enabled is not None:
            rule.is_enabled = is_enabled
        if parameter_value is not None:
            rule.parameter_value = parameter_value
        if custom_text is not None:
            rule.custom_text = custom_text
        if display_order is not None:
            rule.display_order = display_order

        await self.db.commit()
        await self.db.refresh(rule)
        return rule

    async def delete_rule(self, rule: CompetitionRule) -> None:
        """Delete a competition rule."""
        await self.db.delete(rule)
        await self.db.commit()

    async def bulk_update_rules(
        self,
        competition_id: int,
        rules_data: list[dict],
    ) -> list[CompetitionRule]:
        """Bulk update rules for a competition.

        This replaces all existing rules with the provided list.
        Each item in rules_data should have:
        - rule_template_id (optional): ID of template to use
        - parameter_value (optional): Value for template parameter
        - custom_text (optional): Custom rule text (if no template)
        - is_enabled: Whether rule is enabled
        - display_order: Order in the list
        """
        # Delete existing rules
        existing = await self.list_competition_rules(competition_id)
        for rule in existing:
            await self.db.delete(rule)

        # Create new rules
        created = []
        for i, data in enumerate(rules_data):
            rule = CompetitionRule(
                competition_id=competition_id,
                rule_template_id=data.get("rule_template_id"),
                parameter_value=data.get("parameter_value"),
                custom_text=data.get("custom_text"),
                is_enabled=data.get("is_enabled", True),
                display_order=data.get("display_order", i),
            )
            self.db.add(rule)
            created.append(rule)

        await self.db.commit()
        for rule in created:
            await self.db.refresh(rule)

        return created
