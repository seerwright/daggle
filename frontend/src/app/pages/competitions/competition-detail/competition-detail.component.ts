import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CompetitionService } from '../../../core/services/competition.service';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { Competition } from '../../../core/models/competition.model';
import { AuthService } from '../../../core/services/auth.service';
import { CompetitionHeaderComponent } from './competition-header/competition-header.component';
import { OverviewTabComponent } from './tabs/overview-tab/overview-tab.component';
import { DataTabComponent } from './tabs/data-tab/data-tab.component';
import { LeaderboardTabComponent } from './tabs/leaderboard-tab/leaderboard-tab.component';
import { SubmitTabComponent } from './tabs/submit-tab/submit-tab.component';
import { RulesTabComponent } from './tabs/rules-tab/rules-tab.component';
import { DiscussionTabComponent } from './tabs/discussion-tab/discussion-tab.component';

@Component({
  selector: 'app-competition-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    CompetitionHeaderComponent,
    OverviewTabComponent,
    DataTabComponent,
    LeaderboardTabComponent,
    SubmitTabComponent,
    RulesTabComponent,
    DiscussionTabComponent,
  ],
  template: `
    @if (loading) {
      <div class="competition-loading">
        <mat-spinner diameter="40"></mat-spinner>
        <span class="loading-text">Loading competition...</span>
      </div>
    } @else if (!competition) {
      <div class="competition-empty">
        <mat-icon class="empty-icon">error_outline</mat-icon>
        <h3 class="empty-title">Competition not found</h3>
        <p class="empty-description">
          This competition may have been removed or the URL is incorrect.
        </p>
        <a routerLink="/competitions" class="btn btn-primary">Browse Competitions</a>
      </div>
    } @else {
      <div class="competition-detail">
        <app-competition-header
          [competition]="competition"
          [isEnrolled]="isEnrolled"
          [enrolling]="enrolling"
          [activating]="activating"
          [canManage]="canManageCompetition()"
          [isAuthenticated]="auth.isAuthenticated()"
          (joinClick)="join()"
          (leaveClick)="leave()"
          (activateClick)="activate()"
        ></app-competition-header>

        <div class="competition-tabs">
          <mat-tab-group [selectedIndex]="selectedTabIndex" (selectedIndexChange)="onTabChange($event)">
            <mat-tab label="Overview">
              <app-overview-tab [competition]="competition" [slug]="slug"></app-overview-tab>
            </mat-tab>

            <mat-tab label="Data">
              <app-data-tab [slug]="slug"></app-data-tab>
            </mat-tab>

            <mat-tab label="Leaderboard">
              <app-leaderboard-tab [slug]="slug"></app-leaderboard-tab>
            </mat-tab>

            <mat-tab label="Submit" [disabled]="!isEnrolled">
              <app-submit-tab
                [slug]="slug"
                [competition]="competition"
                [isEnrolled]="isEnrolled"
              ></app-submit-tab>
            </mat-tab>

            <mat-tab label="Rules">
              <app-rules-tab [slug]="slug"></app-rules-tab>
            </mat-tab>

            <mat-tab label="Discussions">
              <app-discussion-tab [slug]="slug" [canPost]="isEnrolled"></app-discussion-tab>
            </mat-tab>
          </mat-tab-group>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }

    .competition-detail {
      max-width: 1000px;
      margin: 0 auto;
      padding: var(--space-8) var(--space-6);
    }

    .competition-loading,
    .competition-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      padding: var(--space-12);
      text-align: center;
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
      margin: 0 0 var(--space-6);
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

    /* Responsive */
    @media (max-width: 768px) {
      .competition-detail {
        padding: var(--space-6) var(--space-4);
      }
    }

    @media (max-width: 480px) {
      .competition-detail {
        padding: var(--space-4);
      }
    }
  `],
})
export class CompetitionDetailComponent implements OnInit {
  private readonly TAB_NAMES = ['overview', 'data', 'leaderboard', 'submit', 'rules', 'discussions'];

  competition: Competition | null = null;
  loading = true;
  slug = '';
  isEnrolled = false;
  enrolling = false;
  activating = false;
  selectedTabIndex = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private competitionService: CompetitionService,
    private enrollmentService: EnrollmentService,
    private snackBar: MatSnackBar,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get('slug') || '';

    // Handle tab query parameter
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam) {
      const tabIndex = this.TAB_NAMES.indexOf(tabParam.toLowerCase());
      if (tabIndex !== -1) {
        this.selectedTabIndex = tabIndex;
      }
    }

    if (this.slug) {
      this.competitionService.getBySlug(this.slug).subscribe({
        next: (data) => {
          this.competition = data;
          this.loading = false;
          this.checkEnrollment();
        },
        error: () => {
          this.loading = false;
        },
      });
    }
  }

  onTabChange(index: number): void {
    this.selectedTabIndex = index;
    const tabName = this.TAB_NAMES[index];
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: tabName === 'overview' ? {} : { tab: tabName },
      queryParamsHandling: tabName === 'overview' ? '' : 'merge',
      replaceUrl: true,
    });
  }

  checkEnrollment(): void {
    if (!this.auth.isAuthenticated()) return;

    this.enrollmentService.getStatus(this.slug).subscribe({
      next: (status) => {
        this.isEnrolled = status.enrolled;
      },
    });
  }

  join(): void {
    this.enrolling = true;
    this.enrollmentService.enroll(this.slug).subscribe({
      next: () => {
        this.isEnrolled = true;
        this.enrolling = false;
        this.snackBar.open('Successfully joined the competition!', 'Close', {
          duration: 3000,
        });
      },
      error: (err) => {
        this.enrolling = false;
        this.snackBar.open(
          err.error?.detail || 'Failed to join competition',
          'Close',
          { duration: 5000 }
        );
      },
    });
  }

  leave(): void {
    this.enrolling = true;
    this.enrollmentService.unenroll(this.slug).subscribe({
      next: () => {
        this.isEnrolled = false;
        this.enrolling = false;
        this.snackBar.open('Left the competition', 'Close', {
          duration: 3000,
        });
      },
      error: (err) => {
        this.enrolling = false;
        this.snackBar.open(
          err.error?.detail || 'Failed to leave competition',
          'Close',
          { duration: 5000 }
        );
      },
    });
  }

  canManageCompetition(): boolean {
    const user = this.auth.currentUser();
    if (!user || !this.competition) return false;
    return user.id === this.competition.sponsor_id || user.role === 'admin';
  }

  activate(): void {
    this.activating = true;
    this.competitionService.update(this.slug, { status: 'active' }).subscribe({
      next: (updated) => {
        this.competition = updated;
        this.activating = false;
        this.snackBar.open('Competition activated! Users can now join.', 'Close', {
          duration: 3000,
        });
      },
      error: (err) => {
        this.activating = false;
        this.snackBar.open(
          err.error?.detail || 'Failed to activate competition',
          'Close',
          { duration: 5000 }
        );
      },
    });
  }
}
