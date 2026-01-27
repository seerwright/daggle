import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { FAQService } from '../../../../../../core/services/faq.service';
import { FAQ } from '../../../../../../core/models/faq.model';

@Component({
  selector: 'app-faq-accordion',
  standalone: true,
  imports: [CommonModule, MatExpansionModule, MatIconModule],
  template: `
    @if (loading) {
      <div class="faq-loading">
        <span class="loading-text">Loading FAQs...</span>
      </div>
    } @else if (faqs.length === 0) {
      <div class="faq-empty">
        <mat-icon class="empty-icon">help_outline</mat-icon>
        <p class="empty-text">No FAQs have been added yet.</p>
      </div>
    } @else {
      <mat-accordion class="faq-accordion" multi>
        @for (faq of faqs; track faq.id) {
          <mat-expansion-panel class="faq-panel">
            <mat-expansion-panel-header>
              <mat-panel-title class="faq-question">
                {{ faq.question }}
              </mat-panel-title>
            </mat-expansion-panel-header>
            <div class="faq-answer">
              {{ faq.answer }}
            </div>
          </mat-expansion-panel>
        }
      </mat-accordion>
    }
  `,
  styles: [`
    .faq-loading,
    .faq-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-8);
      text-align: center;
    }

    .loading-text {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .empty-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: var(--color-text-muted);
      margin-bottom: var(--space-3);
    }

    .empty-text {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin: 0;
    }

    .faq-accordion {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .faq-panel {
      border-radius: var(--radius-md) !important;
      box-shadow: none !important;
      border: 1px solid var(--color-border);
      background-color: var(--color-surface);

      &.mat-expanded {
        border-color: var(--color-accent);
      }

      ::ng-deep .mat-expansion-panel-header {
        padding: var(--space-4);
        font-family: var(--font-body);
      }

      ::ng-deep .mat-expansion-panel-body {
        padding: 0 var(--space-4) var(--space-4);
      }
    }

    .faq-question {
      font-family: var(--font-display);
      font-size: var(--text-base);
      font-weight: 500;
      color: var(--color-text-primary);
      line-height: var(--leading-normal);
    }

    .faq-answer {
      color: var(--color-text-secondary);
      line-height: var(--leading-relaxed);
      white-space: pre-wrap;
    }

    @media (max-width: 480px) {
      .faq-panel {
        ::ng-deep .mat-expansion-panel-header {
          padding: var(--space-3);
        }

        ::ng-deep .mat-expansion-panel-body {
          padding: 0 var(--space-3) var(--space-3);
        }
      }

      .faq-question {
        font-size: var(--text-sm);
      }

      .faq-answer {
        font-size: var(--text-sm);
      }
    }
  `],
})
export class FAQAccordionComponent implements OnInit {
  @Input({ required: true }) slug!: string;

  faqs: FAQ[] = [];
  loading = true;

  constructor(private faqService: FAQService) {}

  ngOnInit(): void {
    this.loadFAQs();
  }

  private loadFAQs(): void {
    this.faqService.list(this.slug).subscribe({
      next: (faqs) => {
        this.faqs = faqs;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
