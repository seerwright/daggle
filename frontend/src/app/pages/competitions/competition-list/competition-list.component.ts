import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CompetitionService } from '../../../core/services/competition.service';
import { CompetitionListItem } from '../../../core/models/competition.model';
import { AuthService } from '../../../core/services/auth.service';

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
      <!-- Page Header -->
      <header class="page-header">
        <h1 class="page-title">Competitions</h1>
        <p class="page-description">
          Tackle real-world data science challenges and climb the leaderboard.
        </p>
      </header>

      <!-- Competitions Grid -->
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
            Competitions will appear here once published.
          </p>
        </div>
      } @else {
        <section class="competitions-section">
          <div class="section-header">
            <h2 class="section-title">Active Challenges</h2>
            <span class="competition-count">{{ competitions.length }} competitions</span>
          </div>

          <div class="competition-grid">
            @for (comp of competitions; track comp.id) {
              <article class="competition-card" [routerLink]="['/competitions', comp.slug]">
                @if (comp.thumbnail_url) {
                  <img [src]="comp.thumbnail_url" [alt]="comp.title" class="card-thumbnail-img" />
                } @else {
                  <div class="card-thumbnail" [style.background-color]="getThumbnailColor(comp.slug)">
                    <span class="thumbnail-letter">{{ comp.title.charAt(0) }}</span>
                  </div>
                }
                <div class="card-content">
                  <h3 class="card-title">{{ comp.title }}</h3>
                  <div class="card-badges">
                    <span class="status-badge" [class]="'status-' + comp.status">
                      {{ getStatusLabel(comp.status) }}
                    </span>
                    <span class="difficulty-badge" [class]="'difficulty-' + comp.difficulty">
                      {{ comp.difficulty }}
                    </span>
                  </div>
                  <p class="card-description">{{ comp.short_description }}</p>
                  <div class="card-meta">
                    <mat-icon>schedule</mat-icon>
                    <span>{{ getTimeRemaining(comp.end_date) }}</span>
                  </div>
                </div>
              </article>
            }
          </div>
        </section>
      }

      <!-- Footer prompt for hosts -->
      @if (canHostCompetition() && !loading && competitions.length > 0) {
        <footer class="page-footer">
          <span class="footer-text">Want to run your own challenge?</span>
          <a routerLink="/competitions/create" class="footer-link">Host a competition</a>
        </footer>
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
      padding: var(--space-6);
    }

    /* Page Header */
    .page-header {
      margin-bottom: var(--space-5);
    }

    .page-title {
      font-family: var(--font-body);
      font-size: 32px;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-2);
      letter-spacing: -0.01em;
    }

    .page-description {
      font-size: 15px;
      color: var(--color-text-secondary);
      margin: 0;
      max-width: 480px;
    }

    /* Section Header */
    .competitions-section {
      margin-bottom: var(--space-6);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: var(--space-4);
    }

    .section-title {
      font-family: var(--font-body);
      font-size: 20px;
      font-weight: 500;
      color: var(--color-text-primary);
      margin: 0;
    }

    .competition-count {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    /* Loading & Empty States */
    .competition-loading,
    .competition-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-10) var(--space-6);
      text-align: center;
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
    }

    .loading-text {
      margin-top: var(--space-3);
      font-size: 13px;
      color: var(--color-text-muted);
    }

    .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--color-text-muted);
      margin-bottom: var(--space-3);
    }

    .empty-title {
      font-family: var(--font-body);
      font-size: 18px;
      font-weight: 500;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-1);
    }

    .empty-description {
      font-size: 14px;
      color: var(--color-text-muted);
      margin: 0;
    }

    /* Competition Grid */
    .competition-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: var(--space-4);
    }

    @media (min-width: 1100px) {
      .competition-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    /* Competition Card */
    .competition-card {
      display: flex;
      flex-direction: column;
      height: 100%;
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      cursor: pointer;
      transition: border-color 150ms ease, box-shadow 150ms ease;

      &:hover {
        border-color: var(--color-border-strong);
        box-shadow: var(--shadow-md);
      }
    }

    .card-thumbnail-img {
      width: 100%;
      aspect-ratio: 2 / 1;
      object-fit: cover;
      flex-shrink: 0;
    }

    .card-thumbnail {
      position: relative;
      aspect-ratio: 2 / 1;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .thumbnail-letter {
      font-family: var(--font-body);
      font-size: 32px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.7);
      text-transform: uppercase;
      user-select: none;
      letter-spacing: 0.02em;
    }

    .card-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: var(--space-4);
    }

    .card-title {
      font-family: var(--font-body);
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-2);
      line-height: 1.35;
    }

    .card-badges {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      margin-bottom: var(--space-3);
    }

    .status-badge,
    .difficulty-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      font-size: 11px;
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

    .card-description {
      font-size: 14px;
      color: var(--color-text-secondary);
      line-height: 1.5;
      margin: 0;
      flex: 1;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-meta {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      margin-top: var(--space-3);
      padding-top: var(--space-3);
      border-top: 1px solid var(--color-border);
      font-size: 12px;
      color: var(--color-text-muted);

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    /* Page Footer */
    .page-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      padding: var(--space-6) 0;
      margin-top: var(--space-4);
      border-top: 1px solid var(--color-border);
    }

    .footer-text {
      font-size: 14px;
      color: var(--color-text-muted);
    }

    .footer-link {
      font-size: 14px;
      font-weight: 500;
      color: var(--color-accent);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .competitions-page {
        padding: var(--space-5) var(--space-4);
      }

      .page-title {
        font-size: 26px;
      }

      .competition-grid {
        grid-template-columns: 1fr;
        gap: var(--space-3);
      }
    }

    @media (max-width: 480px) {
      .competitions-page {
        padding: var(--space-4);
      }

      .page-header {
        margin-bottom: var(--space-4);
      }

      .page-title {
        font-size: 24px;
      }

      .page-description {
        font-size: 14px;
      }

      .section-title {
        font-size: 18px;
      }

      .thumbnail-letter {
        font-size: 24px;
      }

      .page-footer {
        flex-direction: column;
        gap: var(--space-1);
        padding: var(--space-5) 0;
      }
    }
  `],
})
export class CompetitionListComponent implements OnInit {
  competitions: CompetitionListItem[] = [];
  loading = true;

  // Muted, professional color palette for thumbnails
  private thumbnailColors = [
    '#64748b', // slate
    '#6b7280', // gray
    '#71717a', // zinc
    '#737373', // neutral
    '#78716c', // stone
    '#7c8594', // cool gray
    '#6d7a8a', // blue gray
    '#7a7a7a', // true gray
  ];

  constructor(
    private competitionService: CompetitionService,
    public auth: AuthService
  ) {}

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

  canHostCompetition(): boolean {
    const user = this.auth.currentUser();
    return user !== null && (user.role === 'sponsor' || user.role === 'admin');
  }

  getThumbnailColor(slug: string): string {
    const hash = this.hashString(slug);
    return this.thumbnailColors[hash % this.thumbnailColors.length];
  }

  getStatusLabel(status: string): string {
    // Sentence case for status badges
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  getTimeRemaining(endDate: string): string {
    const end = new Date(endDate);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();

    if (diffMs < 0) {
      return 'Ended';
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 30) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} left`;
    } else if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} left`;
    } else {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} left`;
      }
      return 'Ending soon';
    }
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
