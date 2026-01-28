"""Rule schemas for API request/response validation."""

from datetime import datetime

from pydantic import BaseModel, Field


class RuleTemplateResponse(BaseModel):
    """Schema for rule template response."""

    id: int
    category: str
    template_text: str
    has_parameter: bool
    parameter_type: str | None
    parameter_label: str | None
    display_order: int

    class Config:
        from_attributes = True


class CompetitionRuleCreate(BaseModel):
    """Schema for creating a competition rule."""

    rule_template_id: int | None = None
    parameter_value: str | None = None
    custom_text: str | None = None
    display_order: int = Field(default=0, ge=0)


class CompetitionRuleUpdate(BaseModel):
    """Schema for updating a competition rule."""

    is_enabled: bool | None = None
    parameter_value: str | None = None
    custom_text: str | None = None
    display_order: int | None = Field(default=None, ge=0)


class CompetitionRuleResponse(BaseModel):
    """Schema for competition rule response."""

    id: int
    competition_id: int
    rule_template_id: int | None
    is_enabled: bool
    parameter_value: str | None
    custom_text: str | None
    display_order: int
    rendered_text: str
    template: RuleTemplateResponse | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_rule(cls, rule) -> "CompetitionRuleResponse":
        """Create response from CompetitionRule model."""
        return cls(
            id=rule.id,
            competition_id=rule.competition_id,
            rule_template_id=rule.rule_template_id,
            is_enabled=rule.is_enabled,
            parameter_value=rule.parameter_value,
            custom_text=rule.custom_text,
            display_order=rule.display_order,
            rendered_text=rule.get_rendered_text(),
            template=RuleTemplateResponse.model_validate(rule.template) if rule.template else None,
            created_at=rule.created_at,
            updated_at=rule.updated_at,
        )


class RuleBulkUpdate(BaseModel):
    """Schema for bulk updating competition rules."""

    rules: list[CompetitionRuleCreate]


class RulesDisplayResponse(BaseModel):
    """Schema for displaying rules to participants (simplified view)."""

    category: str
    rules: list[str]
