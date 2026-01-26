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
      <!-- Hero Section -->
      <section class="hero">
        <div class="hero-content">
          <h1 class="hero-title">Competitions</h1>
          <p class="hero-description">
            Sharpen your data science skills by tackling real-world challenges.
            Compete, learn, and climb the leaderboard.
          </p>
          <div class="hero-benefits">
            <div class="benefit">
              <mat-icon>school</mat-icon>
              <span>Learn by doing</span>
            </div>
            <div class="benefit">
              <mat-icon>trending_up</mat-icon>
              <span>Track your progress</span>
            </div>
            <div class="benefit">
              <mat-icon>groups</mat-icon>
              <span>Join the community</span>
            </div>
          </div>
        </div>
        @if (canHostCompetition()) {
          <div class="hero-action">
            <a routerLink="/competitions/create" class="btn-host">
              <mat-icon>add_circle</mat-icon>
              Host a Competition
            </a>
          </div>
        }
      </section>

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
            Check back soon for new data science challenges.
          </p>
          @if (canHostCompetition()) {
            <a routerLink="/competitions/create" class="btn btn-primary">
              Create the first competition
            </a>
          }
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
                <div class="card-thumbnail" [style.background-color]="getThumbnailColor(comp.slug)">
                  <span class="thumbnail-letter">{{ comp.title.charAt(0) }}</span>
                </div>
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

      <!-- Call to Action -->
      @if (!loading && competitions.length > 0) {
        <section class="cta-section">
          <div class="cta-content">
            <h3 class="cta-title">Ready to test your skills?</h3>
            <p class="cta-description">
              Join a competition today and see how you stack up against other data scientists.
            </p>
          </div>
          @if (!auth.isAuthenticated()) {
            <a routerLink="/register" class="btn btn-primary btn-lg">
              Create Free Account
            </a>
          }
        </section>
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

    /* Hero Section */
    .hero {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--space-6);
      padding: var(--space-8);
      margin-bottom: var(--space-8);
      background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-muted) 100%);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -10%;
        width: 400px;
        height: 400px;
        background: radial-gradient(circle, var(--color-accent-light) 0%, transparent 70%);
        opacity: 0.5;
        pointer-events: none;
      }
    }

    .hero-content {
      position: relative;
      z-index: 1;
      flex: 1;
    }

    .hero-title {
      font-family: var(--font-display);
      font-size: var(--text-4xl);
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-3);
      letter-spacing: -0.02em;
    }

    .hero-description {
      font-size: var(--text-lg);
      color: var(--color-text-secondary);
      line-height: var(--leading-relaxed);
      margin: 0 0 var(--space-6);
      max-width: 560px;
    }

    .hero-benefits {
      display: flex;
      gap: var(--space-6);
    }

    .benefit {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      font-weight: 500;
      color: var(--color-text-secondary);

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: var(--color-accent);
      }
    }

    .hero-action {
      position: relative;
      z-index: 1;
      flex-shrink: 0;
    }

    .btn-host {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-5);
      font-family: var(--font-body);
      font-size: var(--text-base);
      font-weight: 600;
      color: white;
      background-color: var(--color-accent);
      border: none;
      border-radius: var(--radius-md);
      text-decoration: none;
      cursor: pointer;
      transition: all 150ms ease;
      box-shadow: var(--shadow-md);

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      &:hover {
        background-color: var(--color-accent-hover);
        transform: translateY(-1px);
        box-shadow: var(--shadow-lg);
      }
    }

    /* Section Header */
    .competitions-section {
      margin-bottom: var(--space-8);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: var(--space-5);
    }

    .section-title {
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: 600;
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
      margin: 0 0 var(--space-5);
    }

    /* Competition Grid */
    .competition-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: var(--space-5);
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
      min-height: 280px;
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

    .card-thumbnail {
      position: relative;
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .thumbnail-letter {
      font-family: var(--font-body);
      font-size: 36px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.85);
      text-transform: uppercase;
      user-select: none;
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

    /* CTA Section */
    .cta-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-6);
      padding: var(--space-8);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
    }

    .cta-content {
      flex: 1;
    }

    .cta-title {
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-2);
    }

    .cta-description {
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
      margin: 0;
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
      transition: all 150ms ease;
    }

    .btn-primary {
      background-color: var(--color-accent);
      color: white;

      &:hover {
        background-color: var(--color-accent-hover);
      }
    }

    .btn-lg {
      padding: var(--space-3) var(--space-6);
      font-size: var(--text-base);
    }

    /* Responsive */
    @media (max-width: 900px) {
      .hero {
        flex-direction: column;
        gap: var(--space-5);
      }

      .hero-action {
        width: 100%;
      }

      .btn-host {
        width: 100%;
        justify-content: center;
      }
    }

    @media (max-width: 768px) {
      .competitions-page {
        padding: var(--space-6) var(--space-4);
      }

      .hero {
        padding: var(--space-6);
      }

      .hero-title {
        font-size: var(--text-3xl);
      }

      .hero-description {
        font-size: var(--text-base);
      }

      .hero-benefits {
        flex-direction: column;
        gap: var(--space-3);
      }

      .competition-grid {
        grid-template-columns: 1fr;
        gap: var(--space-4);
      }

      .cta-section {
        flex-direction: column;
        text-align: center;
      }
    }

    @media (max-width: 480px) {
      .competitions-page {
        padding: var(--space-4);
      }

      .hero {
        padding: var(--space-5);
        margin-bottom: var(--space-6);
      }

      .hero-title {
        font-size: var(--text-2xl);
      }

      .card-thumbnail {
        height: 80px;
      }

      .thumbnail-letter {
        font-size: 28px;
      }

      .competition-card {
        min-height: 240px;
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
