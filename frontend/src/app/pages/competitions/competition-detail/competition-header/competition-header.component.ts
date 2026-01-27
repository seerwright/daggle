import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Competition } from '../../../../core/models/competition.model';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-competition-header',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <header class="competition-header">
      <div class="header-top">
        @if (competition.thumbnail_url) {
          <div class="thumbnail-container">
            <img [src]="competition.thumbnail_url" [alt]="competition.title" class="thumbnail" />
          </div>
        }
        <div class="header-content">
          <h1 class="competition-title">{{ competition.title }}</h1>
          @if (competition.short_description) {
            <p class="competition-tagline">{{ competition.short_description }}</p>
          }
          <div class="competition-meta">
            <span class="status-badge" [class]="'status-' + competition.status">
              {{ competition.status }}
            </span>
            <span class="difficulty-badge" [class]="'difficulty-' + competition.difficulty">
              {{ competition.difficulty }}
            </span>
            <span class="competition-meta-item">
              <mat-icon>calendar_today</mat-icon>
              {{ competition.start_date | date:'mediumDate' }} - {{ competition.end_date | date:'mediumDate' }}
            </span>
          </div>
        </div>
      </div>

      <div class="header-bottom">
        <div class="competition-stats">
          <div class="competition-stat">
            <span class="stat-value">{{ competition.evaluation_metric }}</span>
            <span class="stat-label">Metric</span>
          </div>
          <div class="competition-stat">
            <span class="stat-value">{{ competition.max_team_size }}</span>
            <span class="stat-label">Max Team</span>
          </div>
          <div class="competition-stat">
            <span class="stat-value">{{ competition.daily_submission_limit }}</span>
            <span class="stat-label">Daily Limit</span>
          </div>
        </div>

        <div class="competition-actions">
          @if (canManage) {
            <a class="btn btn-secondary" [routerLink]="['/competitions', competition.slug, 'edit']">
              Edit Competition
            </a>
          }
          @if (canManage && competition.status === 'draft') {
            <button class="btn btn-primary" (click)="activateClick.emit()" [disabled]="activating">
              {{ activating ? 'Activating...' : 'Activate Competition' }}
            </button>
          }
          @if (isAuthenticated) {
            @if (isEnrolled) {
              <button class="btn btn-danger-outline" (click)="leaveClick.emit()" [disabled]="enrolling">
                Leave Competition
              </button>
            } @else if (competition.status === 'active') {
              <button class="btn btn-primary" (click)="joinClick.emit()" [disabled]="enrolling">
                {{ enrolling ? 'Joining...' : 'Join Competition' }}
              </button>
            }
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    .competition-header {
      margin-bottom: var(--space-6);
    }

    .header-top {
      display: flex;
      gap: var(--space-6);
      margin-bottom: var(--space-5);
    }

    .thumbnail-container {
      flex-shrink: 0;
      width: 120px;
      height: 120px;
      border-radius: var(--radius-lg);
      overflow: hidden;
      background-color: var(--color-surface-muted);
      border: 1px solid var(--color-border);
    }

    .thumbnail {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .header-content {
      flex: 1;
      min-width: 0;
    }

    .competition-title {
      font-family: var(--font-display);
      font-size: var(--text-3xl);
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-2);
      letter-spacing: -0.01em;
    }

    .competition-tagline {
      font-size: var(--text-base);
      color: var(--color-text-secondary);
      margin: 0 0 var(--space-3);
      line-height: var(--leading-relaxed);
    }

    .competition-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
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

    .competition-meta-item {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      color: var(--color-text-secondary);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--color-text-muted);
      }
    }

    .header-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-5);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
    }

    .competition-stats {
      display: flex;
      gap: var(--space-8);
    }

    .competition-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;

      .stat-value {
        font-family: var(--font-display);
        font-size: var(--text-lg);
        font-weight: 700;
        color: var(--color-text-primary);
        line-height: 1;
        text-transform: uppercase;
      }

      .stat-label {
        display: block;
        font-size: var(--text-xs);
        color: var(--color-text-muted);
        margin-top: var(--space-1);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    }

    .competition-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-2) var(--space-4);
      font-family: var(--font-body);
      font-size: var(--text-sm);
      font-weight: 500;
      text-decoration: none;
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 150ms ease;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .btn-primary {
      background-color: var(--color-accent);
      color: white;

      &:hover:not(:disabled) {
        background-color: var(--color-accent-hover);
      }
    }

    .btn-secondary {
      background-color: transparent;
      color: var(--color-text-primary);
      border-color: var(--color-border-strong);

      &:hover:not(:disabled) {
        background-color: var(--color-surface-muted);
      }
    }

    .btn-danger-outline {
      background-color: transparent;
      color: var(--color-error);
      border-color: var(--color-error);

      &:hover:not(:disabled) {
        background-color: var(--color-error-light);
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .header-top {
        flex-direction: column;
        gap: var(--space-4);
      }

      .thumbnail-container {
        width: 80px;
        height: 80px;
      }

      .competition-title {
        font-size: var(--text-2xl);
      }

      .competition-meta {
        gap: var(--space-2);
      }

      .header-bottom {
        flex-direction: column;
        align-items: stretch;
        gap: var(--space-4);
      }

      .competition-stats {
        justify-content: space-around;
      }

      .competition-actions {
        justify-content: center;
      }
    }

    @media (max-width: 480px) {
      .competition-stats {
        flex-direction: column;
        gap: var(--space-3);
      }

      .competition-stat {
        flex-direction: row;
        justify-content: space-between;
        padding: var(--space-2) 0;
        border-bottom: 1px solid var(--color-border);

        &:last-child {
          border-bottom: 0;
        }

        .stat-label {
          margin-top: 0;
          order: -1;
        }
      }

      .competition-actions {
        flex-direction: column;
      }

      .competition-actions .btn {
        width: 100%;
      }
    }
  `],
})
export class CompetitionHeaderComponent {
  @Input({ required: true }) competition!: Competition;
  @Input() isEnrolled = false;
  @Input() enrolling = false;
  @Input() activating = false;
  @Input() canManage = false;
  @Input() isAuthenticated = false;

  @Output() joinClick = new EventEmitter<void>();
  @Output() leaveClick = new EventEmitter<void>();
  @Output() activateClick = new EventEmitter<void>();
}
