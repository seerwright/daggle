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
    <div class="profile-container">
      @if (loading) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else if (error) {
        <mat-card class="error-card">
          <mat-card-content>
            <mat-icon>error</mat-icon>
            <p>{{ error }}</p>
            <a mat-button routerLink="/" color="primary">Go Home</a>
          </mat-card-content>
        </mat-card>
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
            <h1>{{ profile.display_name }}</h1>
            <p class="username">&#64;{{ profile.username }}</p>
            <p class="join-date">
              <mat-icon>calendar_today</mat-icon>
              Joined {{ profile.created_at | date:'MMMM yyyy' }}
            </p>
          </div>
        </header>

        <!-- Stats Cards -->
        <div class="stats-grid">
          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-value">{{ profile.participations.length }}</div>
              <div class="stat-label">Competitions</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-value">{{ getTotalSubmissions() }}</div>
              <div class="stat-label">Total Submissions</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-value">{{ getBestRank() || '-' }}</div>
              <div class="stat-label">Best Rank</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-value">{{ getCompetitionsWithSubmissions() }}</div>
              <div class="stat-label">Active Participations</div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Participations -->
        <section class="participations-section">
          <h2>Competition History</h2>

          @if (profile.participations.length === 0) {
            <mat-card class="empty-card">
              <mat-card-content>
                <mat-icon>emoji_events</mat-icon>
                <p>No competition participations yet.</p>
              </mat-card-content>
            </mat-card>
          } @else {
            <div class="participations-list">
              @for (participation of profile.participations; track participation.competition_id) {
                <mat-card
                  class="participation-card"
                  [routerLink]="['/competitions', participation.competition_slug]"
                >
                  <mat-card-content>
                    <div class="participation-info">
                      <h3>{{ participation.competition_title }}</h3>
                      <p class="enrolled-date">
                        Joined {{ participation.enrolled_at | date:'mediumDate' }}
                      </p>
                    </div>
                    <div class="participation-stats">
                      @if (participation.rank !== null) {
                        <div class="stat">
                          <span class="value">#{{ participation.rank }}</span>
                          <span class="label">of {{ participation.total_participants }}</span>
                        </div>
                      }
                      @if (participation.best_score !== null) {
                        <div class="stat">
                          <span class="value">{{ participation.best_score | number:'1.4-4' }}</span>
                          <span class="label">Best Score</span>
                        </div>
                      }
                      <div class="stat">
                        <span class="value">{{ participation.submission_count }}</span>
                        <span class="label">Submissions</span>
                      </div>
                    </div>
                  </mat-card-content>
                </mat-card>
              }
            </div>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    .profile-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
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

    /* Profile Header */
    .profile-header {
      display: flex;
      gap: 2rem;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid var(--border-color, #e0e0e0);
    }

    .avatar-large {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      overflow: hidden;
      background: var(--bg-tertiary, #f5f5f5);
      flex-shrink: 0;
    }

    .avatar-large img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .profile-info h1 {
      font-size: 2rem;
      font-weight: 500;
      margin: 0 0 0.25rem;
    }

    .username {
      font-size: 1.125rem;
      color: var(--text-secondary, #666);
      margin: 0 0 0.5rem;
    }

    .join-date {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-tertiary, #999);
      font-size: 0.875rem;
      margin: 0;
    }

    .join-date mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
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

    .stat-label {
      font-size: 0.875rem;
      color: var(--text-secondary, #666);
      margin-top: 0.25rem;
    }

    /* Participations */
    .participations-section h2 {
      font-size: 1.25rem;
      font-weight: 500;
      margin-bottom: 1rem;
    }

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

    .participations-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .participation-card {
      cursor: pointer;
      transition: box-shadow 0.2s;
    }

    .participation-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .participation-card mat-card-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .participation-info h3 {
      margin: 0 0 0.25rem;
      font-size: 1rem;
      font-weight: 500;
    }

    .enrolled-date {
      margin: 0;
      font-size: 0.75rem;
      color: var(--text-secondary, #666);
    }

    .participation-stats {
      display: flex;
      gap: 1.5rem;
    }

    .participation-stats .stat {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .participation-stats .value {
      font-size: 1.125rem;
      font-weight: 600;
    }

    .participation-stats .label {
      font-size: 0.75rem;
      color: var(--text-secondary, #666);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .profile-header {
        flex-direction: column;
        text-align: center;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .participation-card mat-card-content {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }

      .participation-stats {
        width: 100%;
        justify-content: space-between;
      }

      .participation-stats .stat {
        align-items: center;
      }
    }

    @media (max-width: 480px) {
      .profile-container {
        padding: 1rem;
      }

      .avatar-large {
        width: 80px;
        height: 80px;
      }

      .profile-info h1 {
        font-size: 1.5rem;
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
    private profileService: ProfileService
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
}
