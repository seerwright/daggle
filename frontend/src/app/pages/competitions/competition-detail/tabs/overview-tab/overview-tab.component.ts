import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Competition } from '../../../../../core/models/competition.model';

@Component({
  selector: 'app-overview-tab',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="overview-tab">
      <!-- Description Section -->
      <section class="overview-section">
        <h2 class="section-title">Description</h2>
        <div class="section-content">
          <p class="description-text">{{ competition.description }}</p>
        </div>
      </section>

      <!-- Evaluation Section -->
      <section class="overview-section">
        <h2 class="section-title">Evaluation</h2>
        <div class="section-content">
          <div class="evaluation-metric">
            <span class="metric-label">Metric</span>
            <span class="metric-value">{{ competition.evaluation_metric | uppercase }}</span>
          </div>
          @if (competition.evaluation_description) {
            <p class="evaluation-description">{{ competition.evaluation_description }}</p>
          } @else {
            <p class="evaluation-description muted">
              Submissions are evaluated using the {{ competition.evaluation_metric }} metric.
            </p>
          }
        </div>
      </section>

      <!-- Timeline Section -->
      <section class="overview-section">
        <h2 class="section-title">Timeline</h2>
        <div class="section-content">
          <div class="timeline">
            <div class="timeline-track">
              <div class="timeline-progress" [style.width.%]="progressPercent"></div>
              <div class="timeline-marker timeline-start" [class.active]="hasStarted">
                <mat-icon>{{ hasStarted ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
              </div>
              <div class="timeline-marker timeline-now" *ngIf="hasStarted && !hasEnded" [style.left.%]="progressPercent">
                <mat-icon>schedule</mat-icon>
              </div>
              <div class="timeline-marker timeline-end" [class.active]="hasEnded">
                <mat-icon>{{ hasEnded ? 'flag' : 'outlined_flag' }}</mat-icon>
              </div>
            </div>
            <div class="timeline-labels">
              <div class="timeline-label">
                <span class="label-date">{{ competition.start_date | date:'mediumDate' }}</span>
                <span class="label-text">Start</span>
              </div>
              <div class="timeline-label timeline-label-end">
                <span class="label-date">{{ competition.end_date | date:'mediumDate' }}</span>
                <span class="label-text">End</span>
              </div>
            </div>
            <div class="timeline-status">
              @if (!hasStarted) {
                <span class="status-badge status-upcoming">
                  <mat-icon>event</mat-icon>
                  Starts in {{ daysUntilStart }} days
                </span>
              } @else if (!hasEnded) {
                <span class="status-badge status-active">
                  <mat-icon>timer</mat-icon>
                  {{ daysRemaining }} days remaining
                </span>
              } @else {
                <span class="status-badge status-ended">
                  <mat-icon>check</mat-icon>
                  Competition ended
                </span>
              }
            </div>
          </div>
        </div>
      </section>

      <!-- FAQ Section Placeholder - will be populated by FAQ component -->
      <section class="overview-section" id="faq-section">
        <h2 class="section-title">Frequently Asked Questions</h2>
        <div class="section-content">
          <ng-content select="[faq]"></ng-content>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .overview-tab {
      padding: var(--space-6) 0;
    }

    .overview-section {
      margin-bottom: var(--space-8);

      &:last-child {
        margin-bottom: 0;
      }
    }

    .section-title {
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-4);
    }

    .description-text {
      white-space: pre-wrap;
      color: var(--color-text-secondary);
      line-height: var(--leading-relaxed);
      margin: 0;
    }

    /* Evaluation Section */
    .evaluation-metric {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      margin-bottom: var(--space-4);
    }

    .metric-label {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .metric-value {
      font-family: var(--font-display);
      font-weight: 600;
      color: var(--color-accent);
    }

    .evaluation-description {
      color: var(--color-text-secondary);
      line-height: var(--leading-relaxed);
      margin: 0;

      &.muted {
        color: var(--color-text-muted);
        font-style: italic;
      }
    }

    /* Timeline Section */
    .timeline {
      padding: var(--space-4) 0;
    }

    .timeline-track {
      position: relative;
      height: 4px;
      background-color: var(--color-border);
      border-radius: var(--radius-full);
      margin: var(--space-6) var(--space-8);
    }

    .timeline-progress {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      background-color: var(--color-accent);
      border-radius: var(--radius-full);
      transition: width 0.3s ease;
    }

    .timeline-marker {
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--color-background);
      border: 2px solid var(--color-border);
      border-radius: var(--radius-full);
      color: var(--color-text-muted);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &.active {
        border-color: var(--color-accent);
        color: var(--color-accent);
      }

      &.timeline-start {
        left: 0;
      }

      &.timeline-end {
        left: 100%;
      }

      &.timeline-now {
        border-color: var(--color-success);
        background-color: var(--color-success);
        color: white;
      }
    }

    .timeline-labels {
      display: flex;
      justify-content: space-between;
      margin-top: var(--space-4);
      padding: 0 var(--space-2);
    }

    .timeline-label {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .timeline-label-end {
      text-align: right;
    }

    .label-date {
      font-family: var(--font-display);
      font-size: var(--text-sm);
      font-weight: 500;
      color: var(--color-text-primary);
    }

    .label-text {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .timeline-status {
      display: flex;
      justify-content: center;
      margin-top: var(--space-4);
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      font-size: var(--text-sm);
      font-weight: 500;
      border-radius: var(--radius-md);

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      &.status-upcoming {
        background-color: var(--color-surface-muted);
        color: var(--color-text-secondary);
      }

      &.status-active {
        background-color: var(--color-success-light);
        color: var(--color-success);
      }

      &.status-ended {
        background-color: var(--color-surface-muted);
        color: var(--color-text-muted);
      }
    }

    @media (max-width: 480px) {
      .overview-tab {
        padding: var(--space-4) 0;
      }

      .timeline-track {
        margin: var(--space-6) var(--space-4);
      }

      .timeline-marker {
        width: 28px;
        height: 28px;

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }
      }
    }
  `],
})
export class OverviewTabComponent implements OnInit {
  @Input({ required: true }) competition!: Competition;

  hasStarted = false;
  hasEnded = false;
  progressPercent = 0;
  daysRemaining = 0;
  daysUntilStart = 0;

  ngOnInit(): void {
    this.calculateTimelineState();
  }

  private calculateTimelineState(): void {
    const now = new Date();
    const start = new Date(this.competition.start_date);
    const end = new Date(this.competition.end_date);

    this.hasStarted = now >= start;
    this.hasEnded = now >= end;

    if (!this.hasStarted) {
      this.progressPercent = 0;
      this.daysUntilStart = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    } else if (this.hasEnded) {
      this.progressPercent = 100;
      this.daysRemaining = 0;
    } else {
      const total = end.getTime() - start.getTime();
      const elapsed = now.getTime() - start.getTime();
      this.progressPercent = Math.min(100, Math.max(0, (elapsed / total) * 100));
      this.daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }
  }
}
