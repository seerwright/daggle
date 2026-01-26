import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';

import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { UserProfile, ProfileParticipation } from '../../core/models/profile.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatChipsModule,
  ],
  template: `
    <div class="profile-page">
      @if (loading) {
        <div class="loading-state">
          <mat-spinner diameter="40"></mat-spinner>
          <span class="loading-text">Loading profile...</span>
        </div>
      } @else if (error) {
        <div class="error-state">
          <mat-icon class="error-icon">person_off</mat-icon>
          <h2 class="error-title">Profile not found</h2>
          <p class="error-message">{{ error }}</p>
          <a routerLink="/" class="btn btn-primary">Go Home</a>
        </div>
      } @else if (profile) {
        <!-- Profile Header -->
        <header class="profile-header">
          <div class="avatar-large">
            <img
              [src]="'https://api.dicebear.com/7.x/avataaars/svg?seed=' + profile.username"
              [alt]="profile.display_name"
            />
          </div>
          <div class="profile-info">
            <h1 class="profile-name">{{ profile.display_name }}</h1>
            <p class="profile-username">&#64;{{ profile.username }}</p>
            <p class="profile-joined">
              <mat-icon>calendar_today</mat-icon>
              Joined {{ profile.created_at | date:'MMMM yyyy' }}
            </p>
            @if (isOwnProfile()) {
              <a routerLink="/profile/edit" class="btn btn-secondary edit-button">
                <mat-icon>edit</mat-icon>
                Edit Profile
              </a>
            }
          </div>
        </header>

        <!-- Stats Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-value">{{ profile.participations.length }}</span>
            <span class="stat-label">Competitions</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ getTotalSubmissions() }}</span>
            <span class="stat-label">Total Submissions</span>
          </div>
          <div class="stat-card">
            <span class="stat-value highlight">{{ getBestRank() || '—' }}</span>
            <span class="stat-label">Best Rank</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ getCompetitionsWithSubmissions() }}</span>
            <span class="stat-label">Active Participations</span>
          </div>
        </div>

        <!-- Participations -->
        <section class="participations-section">
          <h2 class="section-title">Competition History</h2>

          @if (profile.participations.length === 0) {
            <div class="empty-state">
              <mat-icon class="empty-icon">emoji_events</mat-icon>
              <p class="empty-text">No competition participations yet</p>
              <p class="empty-description">Join a competition to start building your history</p>
            </div>
          } @else {
            <div class="participations-list">
              @for (participation of profile.participations; track participation.competition_id) {
                <div
                  class="participation-card"
                  [routerLink]="['/competitions', participation.competition_slug]"
                >
                  <div class="participation-info">
                    <h3 class="participation-title">{{ participation.competition_title }}</h3>
                    <p class="participation-date">
                      Joined {{ participation.enrolled_at | date:'mediumDate' }}
                    </p>
                  </div>
                  <div class="participation-stats">
                    @if (participation.rank !== null) {
                      <div class="p-stat rank">
                        <span class="p-value">#{{ participation.rank }}</span>
                        <span class="p-label">of {{ participation.total_participants }}</span>
                      </div>
                    }
                    @if (participation.best_score !== null) {
                      <div class="p-stat score">
                        <span class="p-value">{{ participation.best_score | number:'1.4-4' }}</span>
                        <span class="p-label">Best Score</span>
                      </div>
                    }
                    <div class="p-stat">
                      <span class="p-value">{{ participation.submission_count }}</span>
                      <span class="p-label">Submissions</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .profile-page {
      max-width: 900px;
      margin: 0 auto;
      padding: var(--space-8) var(--space-6);
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
      color: var(--color-text-muted);
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

    /* Profile Header */
    .profile-header {
      display: flex;
      gap: var(--space-8);
      align-items: center;
      margin-bottom: var(--space-8);
      padding-bottom: var(--space-8);
      border-bottom: 1px solid var(--color-border);
    }

    .avatar-large {
      width: 120px;
      height: 120px;
      border-radius: var(--radius-full);
      overflow: hidden;
      background-color: var(--color-surface-muted);
      border: 3px solid var(--color-border);
      flex-shrink: 0;
    }

    .avatar-large img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .profile-info {
      display: flex;
      flex-direction: column;
    }

    .profile-name {
      font-family: var(--font-display);
      font-size: var(--text-3xl);
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-1);
      letter-spacing: -0.01em;
    }

    .profile-username {
      font-size: var(--text-lg);
      color: var(--color-text-muted);
      margin: 0 0 var(--space-2);
    }

    .profile-joined {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      color: var(--color-text-muted);
      font-size: var(--text-sm);
      margin: 0;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    .edit-button {
      margin-top: var(--space-4);
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
      flex-direction: column;
      align-items: center;
      padding: var(--space-5);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      text-align: center;
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--color-border-strong);
        box-shadow: var(--shadow-sm);
      }
    }

    .stat-value {
      font-family: var(--font-display);
      font-size: var(--text-3xl);
      font-weight: 700;
      color: var(--color-text-primary);
      line-height: 1;

      &.highlight {
        color: var(--color-accent);
      }
    }

    .stat-label {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin-top: var(--space-2);
    }

    /* Participations */
    .participations-section {
      margin-top: var(--space-2);
    }

    .section-title {
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-5);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--space-10);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      text-align: center;
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
      margin: 0;
    }

    .participations-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .participation-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
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

    .participation-info {
      display: flex;
      flex-direction: column;
    }

    .participation-title {
      font-family: var(--font-display);
      font-size: var(--text-base);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-1);
    }

    .participation-date {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin: 0;
    }

    .participation-stats {
      display: flex;
      gap: var(--space-6);
    }

    .p-stat {
      display: flex;
      flex-direction: column;
      align-items: flex-end;

      .p-value {
        font-family: var(--font-display);
        font-size: var(--text-lg);
        font-weight: 700;
        color: var(--color-text-primary);
      }

      .p-label {
        font-size: var(--text-xs);
        color: var(--color-text-muted);
      }

      &.rank .p-value {
        color: var(--color-accent);
      }

      &.score .p-value {
        font-family: var(--font-mono);
        color: var(--color-accent);
      }
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-4);
      font-family: var(--font-body);
      font-size: var(--text-sm);
      font-weight: 500;
      text-decoration: none;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .btn-primary {
      background-color: var(--color-accent);
      color: white;

      &:hover {
        background-color: var(--color-accent-hover);
      }
    }

    .btn-secondary {
      background-color: transparent;
      color: var(--color-text-primary);
      border: 1px solid var(--color-border-strong);

      &:hover {
        background-color: var(--color-surface-muted);
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .profile-header {
        flex-direction: column;
        text-align: center;
      }

      .profile-info {
        align-items: center;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .participation-card {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-4);
      }

      .participation-stats {
        width: 100%;
        justify-content: space-between;
      }

      .p-stat {
        align-items: center;
      }
    }

    @media (max-width: 480px) {
      .profile-page {
        padding: var(--space-4);
      }

      .avatar-large {
        width: 80px;
        height: 80px;
      }

      .profile-name {
        font-size: var(--text-2xl);
      }

      .participation-stats {
        flex-wrap: wrap;
        gap: var(--space-4);
      }
    }
  `],
})
export class ProfileComponent implements OnInit {
  profile: UserProfile | null = null;
  loading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private profileService: ProfileService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const username = params['username'];
      if (username) {
        this.loadProfile(username);
      }
    });
  }

  loadProfile(username: string) {
    this.loading = true;
    this.error = null;

    this.profileService.getProfile(username).subscribe({
      next: (data) => {
        this.profile = data;
        this.loading = false;
      },
      error: (err) => {
        if (err.status === 404) {
          this.error = 'User not found';
        } else {
          this.error = err.error?.detail || 'Failed to load profile';
        }
        this.loading = false;
      },
    });
  }

  getTotalSubmissions(): number {
    if (!this.profile) return 0;
    return this.profile.participations.reduce(
      (sum, p) => sum + p.submission_count,
      0
    );
  }

  getBestRank(): number | null {
    if (!this.profile) return null;
    const ranks = this.profile.participations
      .map((p) => p.rank)
      .filter((r): r is number => r !== null);
    return ranks.length > 0 ? Math.min(...ranks) : null;
  }

  getCompetitionsWithSubmissions(): number {
    if (!this.profile) return 0;
    return this.profile.participations.filter((p) => p.submission_count > 0)
      .length;
  }

  isOwnProfile(): boolean {
    const currentUser = this.authService.currentUser();
    return currentUser !== null && this.profile !== null &&
      currentUser.username === this.profile.username;
  }
}
