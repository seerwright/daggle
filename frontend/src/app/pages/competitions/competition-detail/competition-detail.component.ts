import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CompetitionService } from '../../../core/services/competition.service';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { Competition } from '../../../core/models/competition.model';
import { AuthService } from '../../../core/services/auth.service';
import { LeaderboardComponent } from '../leaderboard/leaderboard.component';
import { SubmitComponent } from '../submit/submit.component';
import { DiscussionsComponent } from '../discussions/discussions.component';

@Component({
  selector: 'app-competition-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatChipsModule,
    MatButtonModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    LeaderboardComponent,
    SubmitComponent,
    DiscussionsComponent,
  ],
  template: `
    @if (loading) {
      <div class="loading">
        <mat-spinner></mat-spinner>
      </div>
    } @else if (!competition) {
      <p class="error">Competition not found.</p>
    } @else {
      <div class="competition-header">
        <div class="header-content">
          <h1>{{ competition.title }}</h1>
          <mat-chip-set>
            <mat-chip [class]="'status-' + competition.status">
              {{ competition.status }}
            </mat-chip>
            <mat-chip [class]="'difficulty-' + competition.difficulty">
              {{ competition.difficulty }}
            </mat-chip>
          </mat-chip-set>
        </div>
        <div class="header-actions">
          @if (canManageCompetition()) {
            <a mat-stroked-button [routerLink]="['/competitions', slug, 'edit']">
              Edit Competition
            </a>
          }
          @if (canManageCompetition() && competition.status === 'draft') {
            <button mat-flat-button color="accent" (click)="activate()" [disabled]="activating">
              {{ activating ? 'Activating...' : 'Activate Competition' }}
            </button>
          }
          @if (auth.isAuthenticated()) {
            @if (isEnrolled) {
              <button mat-stroked-button color="warn" (click)="leave()" [disabled]="enrolling">
                Leave Competition
              </button>
            } @else if (competition.status === 'active') {
              <button mat-flat-button color="primary" (click)="join()" [disabled]="enrolling">
                {{ enrolling ? 'Joining...' : 'Join Competition' }}
              </button>
            }
          }
        </div>
      </div>

      <mat-tab-group>
        <mat-tab label="Overview">
          <div class="tab-content">
            <mat-card>
              <mat-card-content>
                <div class="description">{{ competition.description }}</div>

                <div class="meta-grid">
                  <div class="meta-item">
                    <strong>Evaluation Metric</strong>
                    <span>{{ competition.evaluation_metric }}</span>
                  </div>
                  <div class="meta-item">
                    <strong>Max Team Size</strong>
                    <span>{{ competition.max_team_size }}</span>
                  </div>
                  <div class="meta-item">
                    <strong>Daily Submissions</strong>
                    <span>{{ competition.daily_submission_limit }}</span>
                  </div>
                  <div class="meta-item">
                    <strong>Start Date</strong>
                    <span>{{ competition.start_date | date:'medium' }}</span>
                  </div>
                  <div class="meta-item">
                    <strong>End Date</strong>
                    <span>{{ competition.end_date | date:'medium' }}</span>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <mat-tab label="Leaderboard">
          <div class="tab-content">
            <app-leaderboard [slug]="slug"></app-leaderboard>
          </div>
        </mat-tab>

        <mat-tab label="Submit" [disabled]="!isEnrolled">
          <div class="tab-content">
            @if (isEnrolled) {
              <app-submit [slug]="slug" [competition]="competition!"></app-submit>
            } @else {
              <p class="enroll-prompt">Join this competition to submit predictions.</p>
            }
          </div>
        </mat-tab>

        <mat-tab label="Discussions">
          <div class="tab-content">
            <app-discussions [slug]="slug" [canPost]="isEnrolled"></app-discussions>
          </div>
        </mat-tab>
      </mat-tab-group>
    }
  `,
  styles: [`
    .loading, .error {
      text-align: center;
      padding: 64px;
    }
    .competition-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }
    .header-content h1 {
      margin-bottom: 8px;
    }
    .header-actions {
      display: flex;
      gap: 8px;
    }
    .tab-content {
      padding: 24px 0;
    }
    .description {
      white-space: pre-wrap;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .meta-item strong {
      font-size: 0.875rem;
      color: #666;
    }
    .status-active {
      background-color: #4caf50 !important;
      color: white !important;
    }
    .status-draft {
      background-color: #9e9e9e !important;
    }
    .difficulty-beginner {
      background-color: #81c784 !important;
    }
    .difficulty-intermediate {
      background-color: #ffb74d !important;
    }
    .difficulty-advanced {
      background-color: #e57373 !important;
    }
    .enroll-prompt {
      text-align: center;
      color: #666;
      padding: 48px;
    }
  `],
})
export class CompetitionDetailComponent implements OnInit {
  competition: Competition | null = null;
  loading = true;
  slug = '';
  isEnrolled = false;
  enrolling = false;
  activating = false;

  constructor(
    private route: ActivatedRoute,
    private competitionService: CompetitionService,
    private enrollmentService: EnrollmentService,
    private snackBar: MatSnackBar,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get('slug') || '';
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
