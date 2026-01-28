import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RuleService } from '../../../../../core/services/rule.service';
import { RulesDisplay } from '../../../../../core/models/rule.model';

@Component({
  selector: 'app-rules-tab',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="rules-tab">
      @if (loading) {
        <div class="loading-state">
          <mat-spinner diameter="32"></mat-spinner>
          <span class="loading-text">Loading rules...</span>
        </div>
      } @else if (rulesDisplay.length === 0) {
        <div class="empty-state">
          <mat-icon class="empty-icon">gavel</mat-icon>
          <h3 class="empty-title">No Rules Defined</h3>
          <p class="empty-description">
            No specific rules have been defined for this competition yet.
            Please check back later or contact the organizer.
          </p>
        </div>
      } @else {
        <div class="rules-content">
          <div class="rules-header">
            <mat-icon class="header-icon">gavel</mat-icon>
            <h2 class="section-title">Competition Rules</h2>
          </div>

          <p class="rules-intro">
            Please read and follow these rules carefully. Violations may result in disqualification.
          </p>

          @for (category of rulesDisplay; track category.category) {
            <div class="rule-category">
              <h3 class="category-title">
                <mat-icon>{{ getCategoryIcon(category.category) }}</mat-icon>
                {{ category.category }}
              </h3>
              <div class="rules-list">
                @for (rule of category.rules; track rule.title) {
                  <div class="rule-item">
                    <div class="rule-header">
                      <mat-icon class="rule-icon">check_circle</mat-icon>
                      <h4 class="rule-title">{{ rule.title }}</h4>
                    </div>
                    <p class="rule-description">{{ rule.description }}</p>
                  </div>
                }
              </div>
            </div>
          }

          <div class="rules-footer">
            <mat-icon>info</mat-icon>
            <p>
              By participating in this competition, you agree to abide by these rules.
              The organizers reserve the right to disqualify entries that violate these guidelines.
            </p>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .rules-tab {
      padding: var(--space-6) 0;
    }

    .loading-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      padding: var(--space-12);
      text-align: center;
      background-color: var(--color-surface);
      border: 2px dashed var(--color-border);
      border-radius: var(--radius-lg);
    }

    .loading-text {
      margin-top: var(--space-3);
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--color-text-muted);
      margin-bottom: var(--space-4);
    }

    .empty-title {
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-2);
    }

    .empty-description {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin: 0;
      max-width: 320px;
    }

    /* Rules Content */
    .rules-content {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
    }

    .rules-header {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .header-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: var(--color-accent);
    }

    .section-title {
      font-family: var(--font-display);
      font-size: var(--text-2xl);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0;
    }

    .rules-intro {
      font-size: var(--text-base);
      color: var(--color-text-secondary);
      margin: 0;
      padding: var(--space-4);
      background-color: var(--color-surface);
      border-left: 3px solid var(--color-accent);
      border-radius: var(--radius-sm);
    }

    /* Rule Categories */
    .rule-category {
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .category-title {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-4) var(--space-5);
      margin: 0;
      font-family: var(--font-display);
      font-size: var(--text-lg);
      font-weight: 600;
      color: var(--color-text-primary);
      background-color: var(--color-surface-muted);
      border-bottom: 1px solid var(--color-border);

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: var(--color-accent);
      }
    }

    .rules-list {
      margin: 0;
      padding: var(--space-4) var(--space-5);
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    .rule-item {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .rule-header {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .rule-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--color-success);
      flex-shrink: 0;
    }

    .rule-title {
      font-family: var(--font-display);
      font-size: var(--text-base);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0;
    }

    .rule-description {
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
      line-height: 1.6;
      margin: 0;
      padding-left: 26px;  /* Align with title after icon */
    }

    /* Footer */
    .rules-footer {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      padding: var(--space-4);
      background-color: var(--color-info-light);
      border-radius: var(--radius-md);

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: var(--color-info);
        flex-shrink: 0;
        margin-top: 2px;
      }

      p {
        margin: 0;
        font-size: var(--text-sm);
        color: var(--color-info);
        line-height: 1.5;
      }
    }

    @media (max-width: 480px) {
      .rules-tab {
        padding: var(--space-4) 0;
      }

      .loading-state,
      .empty-state {
        padding: var(--space-8);
        min-height: 200px;
      }

      .category-title {
        padding: var(--space-3) var(--space-4);
        font-size: var(--text-base);
      }

      .rules-list {
        padding: var(--space-3) var(--space-4);
      }

      .rule-text {
        font-size: var(--text-sm);
      }
    }
  `],
})
export class RulesTabComponent implements OnInit {
  @Input({ required: true }) slug!: string;

  rulesDisplay: RulesDisplay[] = [];
  loading = true;

  constructor(private ruleService: RuleService) {}

  ngOnInit(): void {
    this.loadRules();
  }

  private loadRules(): void {
    this.ruleService.getRulesForDisplay(this.slug).subscribe({
      next: (rules) => {
        this.rulesDisplay = rules;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  getCategoryIcon(category: string): string {
    const iconMap: Record<string, string> = {
      'Team Formation': 'groups',
      'Submissions': 'upload_file',
      'Scoring': 'leaderboard',
      'Conduct': 'policy',
      'Custom Rules': 'edit_note',
    };
    return iconMap[category] || 'rule';
  }
}
