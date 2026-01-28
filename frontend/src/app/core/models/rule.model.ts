export interface RuleTemplate {
  id: number;
  category: string;
  title: string;
  template_text: string;  // Description
  has_parameter: boolean;
  parameter_type: 'number' | 'date' | 'text' | null;
  parameter_label: string | null;
  display_order: number;
}

export interface CompetitionRule {
  id: number;
  competition_id: number;
  rule_template_id: number | null;
  is_enabled: boolean;
  parameter_value: string | null;
  custom_title: string | null;
  custom_text: string | null;
  display_order: number;
  title: string;  // Resolved title
  rendered_text: string;  // Resolved description
  template: RuleTemplate | null;
  created_at: string;
  updated_at: string;
}

export interface CompetitionRuleCreate {
  rule_template_id?: number | null;
  parameter_value?: string | null;
  custom_title?: string | null;
  custom_text?: string | null;
  display_order?: number;
}

export interface RuleDisplayItem {
  title: string;
  description: string;
}

export interface RulesDisplay {
  category: string;
  rules: RuleDisplayItem[];
}
