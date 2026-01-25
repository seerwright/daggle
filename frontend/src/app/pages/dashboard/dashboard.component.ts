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
  DashboardCompetition,
  DashboardSubmission,
} from '../../core/models/dashboard.model';
import { Notification } from '../../core/models/notification.model';

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
    <div class="dashboard-container">
      <header class="dashboard-header">
        <h1>Dashboard</h1>
        <p class="subtitle">Welcome back! Here's an overview of your activity.</p>
      </header>

      @if (loading) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else if (error) {
        <mat-card class="error-card">
          <mat-card-content>
            <mat-icon>error</mat-icon>
            <p>{{ error }}</p>
            <button mat-button color="primary" (click)="loadDashboard()">
              Try Again
            </button>
          </mat-card-content>
        </mat-card>
      } @else if (dashboard) {
        <!-- Stats Overview -->
        <div class="stats-grid">
          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-value">{{ dashboard.stats.total_competitions }}</div>
              <div class="stat-label">Competitions Joined</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-value">{{ dashboard.stats.active_competitions }}</div>
              <div class="stat-label">Active Competitions</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-value">{{ dashboard.stats.total_submissions }}</div>
              <div class="stat-label">Total Submissions</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-value" [matBadge]="dashboard.stats.unread_notifications" matBadgeColor="accent" [matBadgeHidden]="dashboard.stats.unread_notifications === 0">
                <mat-icon>notifications</mat-icon>
              </div>
              <div class="stat-label">Notifications</div>
            </mat-card-content>
          </mat-card>
        </div>

        <div class="dashboard-grid">
          <!-- Active Competitions -->
          <section class="dashboard-section">
            <div class="section-header">
              <h2>Your Competitions</h2>
              <a mat-button routerLink="/competitions" color="primary">
                Browse All
              </a>
            </div>

            @if (dashboard.competitions.length === 0) {
              <mat-card class="empty-card">
                <mat-card-content>
                  <mat-icon>emoji_events</mat-icon>
                  <p>You haven't joined any competitions yet.</p>
                  <a mat-raised-button color="primary" routerLink="/competitions">
                    Explore Competitions
                  </a>
                </mat-card-content>
              </mat-card>
            } @else {
              <div class="competitions-list">
                @for (comp of dashboard.competitions; track comp.id) {
                  <mat-card class="competition-card" [routerLink]="['/competitions', comp.slug]">
                    <mat-card-content>
                      <div class="comp-header">
                        <h3>{{ comp.title }}</h3>
                        <mat-chip [class]="'status-' + comp.status">
                          {{ comp.status }}
                        </mat-chip>
                      </div>
                      <div class="comp-stats">
                        @if (comp.user_rank) {
                          <div class="comp-stat">
                            <span class="value">#{{ comp.user_rank }}</span>
                            <span class="label">Rank</span>
                          </div>
                        }
                        @if (comp.best_score !== null) {
                          <div class="comp-stat">
                            <span class="value">{{ comp.best_score | number:'1.4-4' }}</span>
                            <span class="label">Best Score</span>
                          </div>
                        }
                        <div class="comp-stat">
                          <span class="value">{{ comp.submission_count }}</span>
                          <span class="label">Submissions</span>
                        </div>
                        @if (comp.days_remaining !== null && comp.days_remaining > 0) {
                          <div class="comp-stat">
                            <span class="value">{{ comp.days_remaining }}</span>
                            <span class="label">Days Left</span>
                          </div>
                        }
                      </div>
                    </mat-card-content>
                  </mat-card>
                }
              </div>
            }
          </section>

          <!-- Recent Submissions -->
          <section class="dashboard-section">
            <div class="section-header">
              <h2>Recent Submissions</h2>
            </div>

            @if (dashboard.recent_submissions.length === 0) {
              <mat-card class="empty-card">
                <mat-card-content>
                  <mat-icon>upload_file</mat-icon>
                  <p>No submissions yet.</p>
                </mat-card-content>
              </mat-card>
            } @else {
              <div class="submissions-list">
                @for (sub of dashboard.recent_submissions; track sub.id) {
                  <mat-card class="submission-card" [routerLink]="['/competitions', sub.competition_slug]">
                    <mat-card-content>
                      <div class="sub-info">
                        <span class="comp-title">{{ sub.competition_title }}</span>
                        <span class="sub-time">{{ sub.created_at | date:'short' }}</span>
                      </div>
                      <div class="sub-result">
                        @if (sub.status === 'scored' && sub.score !== null) {
                          <span class="score">{{ sub.score | number:'1.4-4' }}</span>
                        } @else if (sub.status === 'pending' || sub.status === 'processing') {
                          <mat-chip class="status-pending">Processing</mat-chip>
                        } @else {
                          <mat-chip class="status-error">{{ sub.status }}</mat-chip>
                        }
                      </div>
                    </mat-card-content>
                  </mat-card>
                }
              </div>
            }
          </section>

          <!-- Notifications -->
          <section class="dashboard-section">
            <div class="section-header">
              <h2>Recent Notifications</h2>
              @if (dashboard.recent_notifications.length > 0) {
                <button mat-button color="primary" (click)="markAllRead()">
                  Mark All Read
                </button>
              }
            </div>

            @if (dashboard.recent_notifications.length === 0) {
              <mat-card class="empty-card">
                <mat-card-content>
                  <mat-icon>notifications_none</mat-icon>
                  <p>No new notifications.</p>
                </mat-card-content>
              </mat-card>
            } @else {
              <div class="notifications-list">
                @for (notif of dashboard.recent_notifications; track notif.id) {
                  <mat-card
                    class="notification-card"
                    [class.unread]="!notif.is_read"
                    (click)="onNotificationClick(notif)"
                  >
                    <mat-card-content>
                      <mat-icon [class]="'notif-icon ' + notif.type">
                        {{ getNotificationIcon(notif.type) }}
                      </mat-icon>
                      <div class="notif-content">
                        <span class="notif-title">{{ notif.title }}</span>
                        <span class="notif-message">{{ notif.message }}</span>
                        <span class="notif-time">{{ notif.created_at | date:'short' }}</span>
                      </div>
                    </mat-card-content>
                  </mat-card>
                }
              </div>
            }
          </section>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .dashboard-header {
      margin-bottom: 2rem;
    }

    .dashboard-header h1 {
      font-size: 2rem;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }

    .subtitle {
      color: var(--text-secondary, #666);
    }

    .loading-container {
      display: flex;
      justify-content: center;
      padding: 4rem;
    }

    .error-card mat-card-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 2rem;
    }

    .error-card mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--warn-color, #f44336);
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      text-align: center;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 600;
      color: var(--primary-color, #1976d2);
    }

    .stat-value mat-icon {
      font-size: 2rem;
      width: 2rem;
      height: 2rem;
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--text-secondary, #666);
      margin-top: 0.25rem;
    }

    /* Dashboard Grid */
    .dashboard-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 2rem;
    }

    .dashboard-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .dashboard-section:last-child {
      grid-column: 1 / -1;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .section-header h2 {
      font-size: 1.25rem;
      font-weight: 500;
      margin: 0;
    }

    /* Empty State */
    .empty-card mat-card-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 2rem;
      text-align: center;
    }

    .empty-card mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      opacity: 0.5;
    }

    /* Competition Cards */
    .competitions-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .competition-card {
      cursor: pointer;
      transition: box-shadow 0.2s;
    }

    .competition-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .comp-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .comp-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 500;
    }

    .comp-stats {
      display: flex;
      gap: 1.5rem;
    }

    .comp-stat {
      display: flex;
      flex-direction: column;
    }

    .comp-stat .value {
      font-size: 1.25rem;
      font-weight: 600;
    }

    .comp-stat .label {
      font-size: 0.75rem;
      color: var(--text-secondary, #666);
    }

    /* Submission Cards */
    .submissions-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .submission-card {
      cursor: pointer;
    }

    .submission-card mat-card-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .sub-info {
      display: flex;
      flex-direction: column;
    }

    .comp-title {
      font-weight: 500;
    }

    .sub-time {
      font-size: 0.75rem;
      color: var(--text-secondary, #666);
    }

    .score {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--primary-color, #1976d2);
    }

    /* Notification Cards */
    .notifications-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .notification-card {
      cursor: pointer;
    }

    .notification-card.unread {
      border-left: 3px solid var(--primary-color, #1976d2);
    }

    .notification-card mat-card-content {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }

    .notif-icon {
      color: var(--text-secondary, #666);
    }

    .notif-icon.submission_scored {
      color: var(--success-color, #4caf50);
    }

    .notif-icon.submission_failed {
      color: var(--warn-color, #f44336);
    }

    .notif-content {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .notif-title {
      font-weight: 500;
    }

    .notif-message {
      font-size: 0.875rem;
      color: var(--text-secondary, #666);
    }

    .notif-time {
      font-size: 0.75rem;
      color: var(--text-tertiary, #999);
      margin-top: 0.25rem;
    }

    /* Status Chips */
    .status-active {
      background-color: var(--success-light, #e8f5e9) !important;
      color: var(--success-color, #4caf50) !important;
    }

    .status-completed {
      background-color: var(--info-light, #e3f2fd) !important;
      color: var(--info-color, #2196f3) !important;
    }

    .status-draft {
      background-color: var(--muted-light, #f5f5f5) !important;
      color: var(--text-secondary, #666) !important;
    }

    .status-pending {
      background-color: var(--warning-light, #fff3e0) !important;
      color: var(--warning-color, #ff9800) !important;
    }

    .status-error {
      background-color: var(--error-light, #ffebee) !important;
      color: var(--error-color, #f44336) !important;
    }

    /* Responsive */
    @media (max-width: 900px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 600px) {
      .dashboard-container {
        padding: 1rem;
      }

      .stats-grid {
        grid-template-columns: 1fr 1fr;
      }

      .comp-stats {
        flex-wrap: wrap;
        gap: 1rem;
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

  onNotificationClick(notification: Notification) {
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
          this.dashboard.recent_notifications.forEach((n) => (n.is_read = true));
          this.dashboard.stats.unread_notifications = 0;
        }
      },
    });
  }
}
