import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  RuleTemplate,
  CompetitionRule,
  CompetitionRuleCreate,
  RulesDisplay,
} from '../models/rule.model';

@Injectable({
  providedIn: 'root',
})
export class RuleService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get all available rule templates.
   */
  listTemplates(): Observable<RuleTemplate[]> {
    return this.http.get<RuleTemplate[]>(`${this.baseUrl}/competitions/rule-templates`);
  }

  /**
   * Get all rules for a competition.
   */
  listRules(slug: string, enabledOnly = true): Observable<CompetitionRule[]> {
    return this.http.get<CompetitionRule[]>(
      `${this.baseUrl}/competitions/${slug}/rules`,
      { params: { enabled_only: enabledOnly.toString() } }
    );
  }

  /**
   * Get rules formatted for display to participants.
   */
  getRulesForDisplay(slug: string): Observable<RulesDisplay[]> {
    return this.http.get<RulesDisplay[]>(
      `${this.baseUrl}/competitions/${slug}/rules/display`
    );
  }

  /**
   * Create a new rule for a competition.
   */
  createRule(slug: string, data: CompetitionRuleCreate): Observable<CompetitionRule> {
    return this.http.post<CompetitionRule>(
      `${this.baseUrl}/competitions/${slug}/rules`,
      data
    );
  }

  /**
   * Bulk update rules for a competition.
   */
  bulkUpdateRules(
    slug: string,
    rules: CompetitionRuleCreate[]
  ): Observable<CompetitionRule[]> {
    return this.http.put<CompetitionRule[]>(
      `${this.baseUrl}/competitions/${slug}/rules`,
      { rules }
    );
  }

  /**
   * Delete a rule from a competition.
   */
  deleteRule(slug: string, ruleId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/competitions/${slug}/rules/${ruleId}`
    );
  }
}
