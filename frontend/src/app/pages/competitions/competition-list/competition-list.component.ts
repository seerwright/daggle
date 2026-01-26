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
                <div class="card-thumbnail" [style.background]="getThumbnailGradient(comp.slug)">
                  <div class="thumbnail-overlay">
                    <mat-icon class="thumbnail-icon">{{ getCategoryIcon(comp.difficulty) }}</mat-icon>
                  </div>
                  <div class="card-badges">
                    <span class="status-badge" [class]="'status-' + comp.status">
                      {{ comp.status }}
                    </span>
                  </div>
                </div>
                <div class="card-content">
                  <div class="card-header">
                    <h3 class="card-title">{{ comp.title }}</h3>
                    <span class="difficulty-pill" [class]="'difficulty-' + comp.difficulty">
                      {{ comp.difficulty }}
                    </span>
                  </div>
                  <p class="card-description">{{ comp.short_description }}</p>
                  <div class="card-meta">
                    <div class="meta-item">
                      <mat-icon>calendar_today</mat-icon>
                      <span>{{ getTimeRemaining(comp.end_date) }}</span>
                    </div>
                    <div class="meta-item">
                      <mat-icon>play_arrow</mat-icon>
                      <span>Starts {{ comp.start_date | date:'MMM d' }}</span>
                    </div>
                  </div>
                </div>
                <div class="card-footer">
                  <span class="footer-action">
                    View Challenge
                    <mat-icon>arrow_forward</mat-icon>
                  </span>
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
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: var(--space-5);
    }

    /* Competition Card */
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
        transform: translateY(-3px);

        .card-footer {
          color: var(--color-accent);
        }

        .thumbnail-overlay {
          opacity: 0.9;
        }
      }
    }

    .card-thumbnail {
      position: relative;
      height: 140px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .thumbnail-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: rgba(0, 0, 0, 0.1);
      transition: opacity 200ms ease;
    }

    .thumbnail-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: rgba(255, 255, 255, 0.9);
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
    }

    .card-badges {
      position: absolute;
      top: var(--space-3);
      left: var(--space-3);
      display: flex;
      gap: var(--space-2);
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: var(--space-1) var(--space-2);
      font-size: var(--text-xs);
      font-weight: 600;
      border-radius: var(--radius-sm);
      text-transform: uppercase;
      letter-spacing: 0.03em;
      backdrop-filter: blur(4px);
    }

    .status-active {
      background-color: rgba(34, 197, 94, 0.9);
      color: white;
    }

    .status-draft {
      background-color: rgba(100, 116, 139, 0.9);
      color: white;
    }

    .status-evaluation {
      background-color: rgba(234, 179, 8, 0.9);
      color: #422006;
    }

    .status-completed {
      background-color: rgba(180, 83, 9, 0.9);
      color: white;
    }

    .status-archived {
      background-color: rgba(100, 116, 139, 0.9);
      color: white;
    }

    .card-content {
      flex: 1;
      padding: var(--space-5);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--space-3);
      margin-bottom: var(--space-3);
    }

    .card-title {
      font-family: var(--font-display);
      font-size: var(--text-lg);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0;
      line-height: 1.3;
      flex: 1;
    }

    .difficulty-pill {
      flex-shrink: 0;
      padding: var(--space-1) var(--space-2);
      font-size: var(--text-xs);
      font-weight: 500;
      border-radius: var(--radius-full);
      text-transform: capitalize;
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
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
      line-height: 1.6;
      margin: 0 0 var(--space-4);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-meta {
      display: flex;
      gap: var(--space-4);
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--text-xs);
      color: var(--color-text-muted);

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: var(--space-3) var(--space-5);
      background-color: var(--color-surface-muted);
      border-top: 1px solid var(--color-border);
      transition: color 200ms ease;
    }

    .footer-action {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--text-sm);
      font-weight: 500;
      color: var(--color-text-secondary);

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        transition: transform 200ms ease;
      }
    }

    .competition-card:hover .footer-action mat-icon {
      transform: translateX(3px);
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
        height: 120px;
      }

      .card-meta {
        flex-direction: column;
        gap: var(--space-2);
      }
    }
  `],
})
export class CompetitionListComponent implements OnInit {
  competitions: CompetitionListItem[] = [];
  loading = true;

  // Gradient color pairs for thumbnails
  private gradients = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140'],
    ['#a8edea', '#fed6e3'],
    ['#d299c2', '#fef9d7'],
    ['#89f7fe', '#66a6ff'],
    ['#cd9cf2', '#f6f3ff'],
    ['#fddb92', '#d1fdff'],
    ['#c1dfc4', '#deecdd'],
    ['#0ba360', '#3cba92'],
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

  getThumbnailGradient(slug: string): string {
    // Generate consistent gradient based on slug hash
    const hash = this.hashString(slug);
    const gradientPair = this.gradients[hash % this.gradients.length];
    return `linear-gradient(135deg, ${gradientPair[0]} 0%, ${gradientPair[1]} 100%)`;
  }

  getCategoryIcon(difficulty: string): string {
    switch (difficulty) {
      case 'beginner':
        return 'school';
      case 'intermediate':
        return 'psychology';
      case 'advanced':
        return 'rocket_launch';
      default:
        return 'emoji_events';
    }
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
