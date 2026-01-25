import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SubmissionService } from '../../../core/services/submission.service';
import { LeaderboardEntry } from '../../../core/models/submission.model';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatProgressSpinnerModule],
  template: `
    @if (loading) {
      <div class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else if (entries.length === 0) {
      <p class="empty">No submissions yet. Be the first to submit!</p>
    } @else {
      <table mat-table [dataSource]="entries" class="leaderboard-table">
        <ng-container matColumnDef="rank">
          <th mat-header-cell *matHeaderCellDef>Rank</th>
          <td mat-cell *matCellDef="let entry">
            <span class="rank" [class.top-3]="entry.rank <= 3">
              {{ entry.rank }}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="user">
          <th mat-header-cell *matHeaderCellDef>Participant</th>
          <td mat-cell *matCellDef="let entry">
            <div class="user-info">
              <strong>{{ entry.display_name }}</strong>
              <span class="username">&#64;{{ entry.username }}</span>
            </div>
          </td>
        </ng-container>

        <ng-container matColumnDef="score">
          <th mat-header-cell *matHeaderCellDef>Best Score</th>
          <td mat-cell *matCellDef="let entry">
            <strong class="score">{{ entry.best_score | number:'1.4-4' }}</strong>
          </td>
        </ng-container>

        <ng-container matColumnDef="submissions">
          <th mat-header-cell *matHeaderCellDef>Submissions</th>
          <td mat-cell *matCellDef="let entry">{{ entry.submission_count }}</td>
        </ng-container>

        <ng-container matColumnDef="lastSubmission">
          <th mat-header-cell *matHeaderCellDef>Last Submission</th>
          <td mat-cell *matCellDef="let entry">
            {{ entry.last_submission | date:'short' }}
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>
    }
  `,
  styles: [`
    .loading, .empty {
      text-align: center;
      padding: 48px;
      color: #666;
    }
    .leaderboard-table {
      width: 100%;
    }
    .rank {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #f5f5f5;
      font-weight: 500;
    }
    .rank.top-3 {
      background: linear-gradient(135deg, #ffd700, #ffb347);
      color: #333;
    }
    .user-info {
      display: flex;
      flex-direction: column;
    }
    .username {
      font-size: 0.875rem;
      color: #666;
    }
    .score {
      color: #1976d2;
      font-size: 1.1rem;
    }
  `],
})
export class LeaderboardComponent implements OnInit {
  @Input() slug!: string;

  entries: LeaderboardEntry[] = [];
  loading = true;
  displayedColumns = ['rank', 'user', 'score', 'submissions', 'lastSubmission'];

  constructor(private submissionService: SubmissionService) {}

  ngOnInit(): void {
    this.loadLeaderboard();
  }

  loadLeaderboard(): void {
    this.submissionService.getLeaderboard(this.slug).subscribe({
      next: (data) => {
        this.entries = data.entries;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
