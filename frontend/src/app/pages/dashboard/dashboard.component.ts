import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';

import { DashboardService } from '../../core/services/dashboard.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  DashboardResponse,
  DashboardNotification,
} from '../../core/models/dashboard.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatBadgeModule,
  ],
  template: `
    <div class="dashboard-page">
      <header class="dashboard-header">
        <h1 class="dashboard-title">Dashboard</h1>
        <p class="dashboard-subtitle">Welcome back! Here's an overview of your activity.</p>
      </header>

      @if (loading) {
        <div class="loading-state">
          <mat-spinner diameter="40"></mat-spinner>
          <span class="loading-text">Loading your dashboard...</span>
        </div>
      } @else if (error) {
        <div class="error-state">
          <mat-icon class="error-icon">error_outline</mat-icon>
          <h2 class="error-title">Something went wrong</h2>
          <p class="error-message">{{ error }}</p>
          <button class="btn btn-primary" (click)="loadDashboard()">
            Try Again
          </button>
        </div>
      } @else if (dashboard) {
        <!-- Stats Overview -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <mat-icon>emoji_events</mat-icon>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ dashboard.stats.total_competitions }}</span>
              <span class="stat-label">Competitions Joined</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon active">
              <mat-icon>play_circle</mat-icon>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ dashboard.stats.active_competitions }}</span>
              <span class="stat-label">Active Competitions</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon submissions">
              <mat-icon>upload_file</mat-icon>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ dashboard.stats.total_submissions }}</span>
              <span class="stat-label">Total Submissions</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon notifications" [matBadge]="dashboard.stats.unread_notifications" matBadgeColor="accent" [matBadgeHidden]="dashboard.stats.unread_notifications === 0">
              <mat-icon>notifications</mat-icon>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ dashboard.stats.unread_notifications }}</span>
              <span class="stat-label">Unread Notifications</span>
            </div>
          </div>
        </div>

        <div class="dashboard-grid">
          <!-- Active Competitions -->
          <section class="dashboard-section competitions-section">
            <div class="section-header">
              <h2 class="section-title">Your Competitions</h2>
              <a routerLink="/competitions" class="section-link">
                Browse All
                <mat-icon>arrow_forward</mat-icon>
              </a>
            </div>

            @if (dashboard.active_competitions.length === 0) {
              <div class="empty-state">
                <mat-icon class="empty-icon">emoji_events</mat-icon>
                <p class="empty-text">No competitions joined yet</p>
                <p class="empty-description">Join a competition to start competing</p>
                <a routerLink="/competitions" class="btn btn-primary">
                  Explore Competitions
                </a>
              </div>
            } @else {
              <div class="competitions-list">
                @for (comp of dashboard.active_competitions; track comp.id) {
                  <div class="competition-card" [routerLink]="['/competitions', comp.slug]">
                    <div class="comp-header">
                      <h3 class="comp-title">{{ comp.title }}</h3>
                      <span class="status-badge" [class]="'status-' + comp.status">
                        {{ comp.status }}
                      </span>
                    </div>
                    <div class="comp-stats">
                      @if (comp.user_rank) {
                        <div class="comp-stat">
                          <span class="stat-value">#{{ comp.user_rank }}</span>
                          <span class="stat-label">Rank</span>
                        </div>
                      }
                      @if (comp.user_best_score !== null) {
                        <div class="comp-stat">
                          <span class="stat-value score">{{ comp.user_best_score | number:'1.4-4' }}</span>
                          <span class="stat-label">Best Score</span>
                        </div>
                      }
                      <div class="comp-stat">
                        <span class="stat-value">{{ comp.user_submission_count }}</span>
                        <span class="stat-label">Submissions</span>
                      </div>
                      @if (comp.days_remaining !== null && comp.days_remaining > 0) {
                        <div class="comp-stat days-left">
                          <span class="stat-value">{{ comp.days_remaining }}</span>
                          <span class="stat-label">Days Left</span>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </section>

          <!-- Recent Submissions -->
          <section class="dashboard-section submissions-section">
            <div class="section-header">
              <h2 class="section-title">Recent Submissions</h2>
            </div>

            @if (dashboard.recent_submissions.length === 0) {
              <div class="empty-state compact">
                <mat-icon class="empty-icon">upload_file</mat-icon>
                <p class="empty-text">No submissions yet</p>
              </div>
            } @else {
              <div class="submissions-list">
                @for (sub of dashboard.recent_submissions; track sub.id) {
                  <div class="submission-card" [routerLink]="['/competitions', sub.competition_slug]">
                    <div class="sub-info">
                      <span class="sub-comp-title">{{ sub.competition_title }}</span>
                      <span class="sub-time">{{ sub.submitted_at | date:'MMM d, h:mm a' }}</span>
                    </div>
                    <div class="sub-result">
                      @if (sub.status === 'scored' && sub.public_score !== null) {
                        <span class="sub-score">{{ sub.public_score | number:'1.4-4' }}</span>
                      } @else if (sub.status === 'pending' || sub.status === 'processing') {
                        <span class="status-badge status-pending">Processing</span>
                      } @else {
                        <span class="status-badge status-failed">{{ sub.status }}</span>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </section>

          <!-- Notifications -->
          <section class="dashboard-section notifications-section">
            <div class="section-header">
              <h2 class="section-title">Recent Notifications</h2>
              @if (dashboard.notifications.length > 0) {
                <button class="section-link" (click)="markAllRead()">
                  Mark All Read
                </button>
              }
            </div>

            @if (dashboard.notifications.length === 0) {
              <div class="empty-state compact">
                <mat-icon class="empty-icon">notifications_none</mat-icon>
                <p class="empty-text">No new notifications</p>
              </div>
            } @else {
              <div class="notifications-list">
                @for (notif of dashboard.notifications; track notif.id) {
                  <div
                    class="notification-card"
                    [class.unread]="!notif.is_read"
                    (click)="onNotificationClick(notif)"
                  >
                    <div class="notif-icon-wrap" [class]="notif.type">
                      <mat-icon>{{ getNotificationIcon(notif.type) }}</mat-icon>
                    </div>
                    <div class="notif-content">
                      <span class="notif-title">{{ notif.title }}</span>
                      <span class="notif-message">{{ notif.message }}</span>
                      <span class="notif-time">{{ notif.created_at | date:'MMM d, h:mm a' }}</span>
                    </div>
                  </div>
                }
              </div>
            }
          </section>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .dashboard-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: var(--space-8) var(--space-6);
    }

    .dashboard-header {
      margin-bottom: var(--space-8);
    }

    .dashboard-title {
      font-family: var(--font-display);
      font-size: var(--text-3xl);
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-2);
      letter-spacing: -0.01em;
    }

    .dashboard-subtitle {
      font-size: var(--text-base);
      color: var(--color-text-muted);
      margin: 0;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-12);
      color: var(--color-text-muted);
    }

    .loading-text {
      margin-top: var(--space-4);
      font-size: var(--text-sm);
    }

    .error-state {
      text-align: center;
      padding: var(--space-12);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
    }

    .error-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--color-error);
      margin-bottom: var(--space-4);
    }

    .error-title {
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-2);
    }

    .error-message {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin: 0 0 var(--space-6);
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--space-4);
      margin-bottom: var(--space-8);
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-5);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--color-border-strong);
        box-shadow: var(--shadow-sm);
      }
    }

    .stat-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      background-color: var(--color-accent-light);
      color: var(--color-accent);

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      &.active {
        background-color: var(--color-success-light);
        color: var(--color-success);
      }

      &.submissions {
        background-color: #e0f2fe;
        color: #0284c7;
      }

      &.notifications {
        background-color: var(--color-warning-light);
        color: var(--color-warning);
      }
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-content .stat-value {
      font-family: var(--font-display);
      font-size: var(--text-2xl);
      font-weight: 700;
      color: var(--color-text-primary);
      line-height: 1;
    }

    .stat-content .stat-label {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin-top: var(--space-1);
    }

    /* Dashboard Grid */
    .dashboard-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: var(--space-6);
    }

    .dashboard-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .notifications-section {
      grid-column: 1 / -1;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .section-title {
      font-family: var(--font-display);
      font-size: var(--text-lg);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0;
    }

    .section-link {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--text-sm);
      font-weight: 500;
      color: var(--color-accent);
      text-decoration: none;
      background: none;
      border: none;
      cursor: pointer;
      transition: color var(--transition-fast);

      &:hover {
        color: var(--color-accent-hover);
      }

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    /* Empty States */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--space-10);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      text-align: center;

      &.compact {
        padding: var(--space-6);
      }
    }

    .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--color-text-muted);
      margin-bottom: var(--space-3);
    }

    .empty-text {
      font-size: var(--text-base);
      font-weight: 500;
      color: var(--color-text-secondary);
      margin: 0 0 var(--space-1);
    }

    .empty-description {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin: 0 0 var(--space-5);
    }

    /* Competition Cards */
    .competitions-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .competition-card {
      padding: var(--space-5);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--color-border-strong);
        box-shadow: var(--shadow-md);
      }
    }

    .comp-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--space-4);
    }

    .comp-title {
      font-family: var(--font-display);
      font-size: var(--text-base);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0;
    }

    .comp-stats {
      display: flex;
      gap: var(--space-6);
    }

    .comp-stat {
      display: flex;
      flex-direction: column;

      .stat-value {
        font-family: var(--font-display);
        font-size: var(--text-lg);
        font-weight: 700;
        color: var(--color-text-primary);

        &.score {
          font-family: var(--font-mono);
          color: var(--color-accent);
        }
      }

      .stat-label {
        font-size: var(--text-xs);
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      &.days-left .stat-value {
        color: var(--color-warning);
      }
    }

    /* Submission Cards */
    .submissions-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .submission-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-4);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--color-border-strong);
      }
    }

    .sub-info {
      display: flex;
      flex-direction: column;
    }

    .sub-comp-title {
      font-weight: 500;
      font-size: var(--text-sm);
      color: var(--color-text-primary);
    }

    .sub-time {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    .sub-score {
      font-family: var(--font-mono);
      font-size: var(--text-base);
      font-weight: 600;
      color: var(--color-accent);
    }

    /* Notification Cards */
    .notifications-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: var(--space-3);
    }

    .notification-card {
      display: flex;
      gap: var(--space-3);
      padding: var(--space-4);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--color-border-strong);
      }

      &.unread {
        border-left: 3px solid var(--color-accent);
        background-color: var(--color-accent-light);
      }
    }

    .notif-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: var(--radius-full);
      background-color: var(--color-surface-muted);
      color: var(--color-text-muted);
      flex-shrink: 0;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      &.submission_scored {
        background-color: var(--color-success-light);
        color: var(--color-success);
      }

      &.submission_failed {
        background-color: var(--color-error-light);
        color: var(--color-error);
      }

      &.competition_started,
      &.competition_ending {
        background-color: var(--color-accent-light);
        color: var(--color-accent);
      }
    }

    .notif-content {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }

    .notif-title {
      font-weight: 500;
      font-size: var(--text-sm);
      color: var(--color-text-primary);
    }

    .notif-message {
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .notif-time {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      margin-top: var(--space-1);
    }

    /* Status Badges */
    .status-badge {
      display: inline-block;
      padding: var(--space-1) var(--space-2);
      font-size: var(--text-xs);
      font-weight: 500;
      border-radius: var(--radius-full);
      text-transform: capitalize;
    }

    .status-active {
      background-color: var(--color-success-light);
      color: var(--color-success);
    }

    .status-completed {
      background-color: #e0f2fe;
      color: #0284c7;
    }

    .status-draft {
      background-color: var(--color-surface-muted);
      color: var(--color-text-muted);
    }

    .status-pending {
      background-color: var(--color-warning-light);
      color: var(--color-warning);
    }

    .status-failed {
      background-color: var(--color-error-light);
      color: var(--color-error);
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-2) var(--space-4);
      font-family: var(--font-body);
      font-size: var(--text-sm);
      font-weight: 500;
      text-decoration: none;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .btn-primary {
      background-color: var(--color-accent);
      color: white;

      &:hover {
        background-color: var(--color-accent-hover);
      }
    }

    /* Responsive */
    @media (max-width: 900px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .dashboard-grid {
        grid-template-columns: 1fr;
      }

      .notifications-list {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 600px) {
      .dashboard-page {
        padding: var(--space-4);
      }

      .dashboard-title {
        font-size: var(--text-2xl);
      }

      .stats-grid {
        grid-template-columns: 1fr 1fr;
        gap: var(--space-3);
      }

      .stat-card {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-3);
        padding: var(--space-4);
      }

      .comp-stats {
        flex-wrap: wrap;
        gap: var(--space-4);
      }
    }
  `],
})
export class DashboardComponent implements OnInit {
  dashboard: DashboardResponse | null = null;
  loading = true;
  error: string | null = null;

  constructor(
    private dashboardService: DashboardService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.loading = true;
    this.error = null;

    this.dashboardService.getDashboard().subscribe({
      next: (data) => {
        this.dashboard = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.detail || 'Failed to load dashboard';
        this.loading = false;
      },
    });
  }

  getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
      submission_scored: 'check_circle',
      submission_failed: 'error',
      competition_started: 'flag',
      competition_ending: 'schedule',
      discussion_reply: 'chat',
      team_invitation: 'group_add',
      team_member_joined: 'person_add',
      team_removed: 'person_remove',
      team_leadership: 'stars',
      system: 'info',
    };
    return icons[type] || 'notifications';
  }

  onNotificationClick(notification: DashboardNotification) {
    if (!notification.is_read) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => {
          notification.is_read = true;
          if (this.dashboard) {
            this.dashboard.stats.unread_notifications--;
          }
        },
      });
    }

    if (notification.link) {
      window.location.href = notification.link;
    }
  }

  markAllRead() {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        if (this.dashboard) {
          this.dashboard.notifications.forEach((n) => (n.is_read = true));
          this.dashboard.stats.unread_notifications = 0;
        }
      },
    });
  }
}
