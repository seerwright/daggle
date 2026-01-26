import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CompetitionService } from '../../../core/services/competition.service';
import { CompetitionListItem } from '../../../core/models/competition.model';

@Component({
  selector: 'app-competition-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="competitions-page">
      <header class="page-header">
        <h1 class="page-title">Competitions</h1>
      </header>

      @if (loading) {
        <div class="competition-loading">
          <mat-spinner diameter="40"></mat-spinner>
          <span class="loading-text">Loading competitions...</span>
        </div>
      } @else if (competitions.length === 0) {
        <div class="competition-empty">
          <mat-icon class="empty-icon">emoji_events</mat-icon>
          <h3 class="empty-title">No competitions yet</h3>
          <p class="empty-description">
            Check back soon for new data science challenges.
          </p>
        </div>
      } @else {
        <div class="competition-grid">
          @for (comp of competitions; track comp.id) {
            <article class="competition-card" [routerLink]="['/competitions', comp.slug]">
              <div class="competition-card-body">
                <h3 class="competition-card-title">{{ comp.title }}</h3>
                <div class="competition-card-meta">
                  <span class="status-badge" [class]="'status-' + comp.status">
                    {{ comp.status }}
                  </span>
                  <span class="difficulty-badge" [class]="'difficulty-' + comp.difficulty">
                    {{ comp.difficulty }}
                  </span>
                </div>
                <p class="competition-card-description">{{ comp.short_description }}</p>
              </div>
              <footer class="competition-card-footer">
                <span>Starts: {{ comp.start_date | date:'mediumDate' }}</span>
                <span>Ends: {{ comp.end_date | date:'mediumDate' }}</span>
              </footer>
            </article>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .competitions-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: var(--space-8) var(--space-6);
    }

    .page-header {
      margin-bottom: var(--space-8);
    }

    .page-title {
      font-family: var(--font-display);
      font-size: var(--text-3xl);
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0;
      letter-spacing: -0.01em;
    }

    .competition-loading,
    .competition-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-12);
      text-align: center;
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
    }

    .loading-text {
      margin-top: var(--space-4);
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .empty-icon {
      font-size: 56px;
      width: 56px;
      height: 56px;
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
    }

    .competition-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: var(--space-5);
    }

    .competition-card {
      display: flex;
      flex-direction: column;
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      cursor: pointer;
      transition: all 200ms ease;

      &:hover {
        border-color: var(--color-border-strong);
        box-shadow: var(--shadow-lg);
        transform: translateY(-2px);
      }
    }

    .competition-card-body {
      flex: 1;
      padding: var(--space-5);
    }

    .competition-card-title {
      font-family: var(--font-display);
      font-size: var(--text-lg);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-3);
      line-height: 1.3;
    }

    .competition-card-meta {
      display: flex;
      gap: var(--space-2);
      margin-bottom: var(--space-3);
    }

    .status-badge,
    .difficulty-badge {
      display: inline-flex;
      align-items: center;
      padding: var(--space-1) var(--space-2);
      font-size: var(--text-xs);
      font-weight: 500;
      border-radius: var(--radius-sm);
      text-transform: capitalize;
    }

    .status-active {
      background-color: var(--color-success-light);
      color: var(--color-success);
    }

    .status-draft {
      background-color: var(--color-surface-muted);
      color: var(--color-text-muted);
    }

    .status-evaluation {
      background-color: var(--color-warning-light);
      color: var(--color-warning);
    }

    .status-completed {
      background-color: var(--color-accent-light);
      color: var(--color-accent);
    }

    .status-archived {
      background-color: var(--color-surface-muted);
      color: var(--color-text-muted);
    }

    .difficulty-beginner {
      background-color: var(--color-success-light);
      color: var(--color-success);
    }

    .difficulty-intermediate {
      background-color: var(--color-warning-light);
      color: var(--color-warning);
    }

    .difficulty-advanced {
      background-color: var(--color-error-light);
      color: var(--color-error);
    }

    .competition-card-description {
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
      line-height: 1.6;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .competition-card-footer {
      display: flex;
      justify-content: space-between;
      padding: var(--space-3) var(--space-5);
      background-color: var(--color-surface-muted);
      border-top: 1px solid var(--color-border);
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .competitions-page {
        padding: var(--space-6) var(--space-4);
      }

      .page-title {
        font-size: var(--text-2xl);
      }

      .competition-grid {
        grid-template-columns: 1fr;
        gap: var(--space-4);
      }
    }

    @media (max-width: 480px) {
      .competitions-page {
        padding: var(--space-4);
      }

      .page-header {
        margin-bottom: var(--space-5);
      }

      .competition-card-footer {
        flex-direction: column;
        gap: var(--space-1);
        text-align: center;
      }
    }
  `],
})
export class CompetitionListComponent implements OnInit {
  competitions: CompetitionListItem[] = [];
  loading = true;

  constructor(private competitionService: CompetitionService) {}

  ngOnInit(): void {
    this.competitionService.list().subscribe({
      next: (data) => {
        this.competitions = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
