import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { SubmissionService } from '../../../core/services/submission.service';
import { LeaderboardEntry } from '../../../core/models/submission.model';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatProgressSpinnerModule, MatIconModule],
  template: `
    @if (loading) {
      <div class="competition-loading">
        <mat-spinner diameter="40"></mat-spinner>
        <span class="loading-text">Loading leaderboard...</span>
      </div>
    } @else if (entries.length === 0) {
      <div class="competition-empty">
        <mat-icon class="empty-icon">leaderboard</mat-icon>
        <h3 class="empty-title">No submissions yet</h3>
        <p class="empty-description">Be the first to submit and claim the top spot!</p>
      </div>
    } @else {
      <div class="table-container">
        <table mat-table [dataSource]="entries" class="leaderboard-table">
          <ng-container matColumnDef="rank">
            <th mat-header-cell *matHeaderCellDef class="rank-cell">Rank</th>
            <td mat-cell *matCellDef="let entry" class="rank-cell">
              <span class="rank-display" [ngClass]="getRankClass(entry.rank)">
                {{ entry.rank }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="user">
            <th mat-header-cell *matHeaderCellDef>Participant</th>
            <td mat-cell *matCellDef="let entry">
              <div class="user-cell">
                <div class="user-avatar">{{ getInitials(entry.display_name) }}</div>
                <div>
                  <div class="user-name">{{ entry.display_name }}</div>
                  <div class="user-team">&#64;{{ entry.username }}</div>
                </div>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="score">
            <th mat-header-cell *matHeaderCellDef>Best Score</th>
            <td mat-cell *matCellDef="let entry" class="score-cell">
              {{ entry.best_score | number:'1.4-4' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="submissions">
            <th mat-header-cell *matHeaderCellDef>Entries</th>
            <td mat-cell *matCellDef="let entry" class="entries-cell">
              {{ entry.submission_count }}
            </td>
          </ng-container>

          <ng-container matColumnDef="lastSubmission">
            <th mat-header-cell *matHeaderCellDef>Last Submission</th>
            <td mat-cell *matCellDef="let entry" class="date-cell">
              {{ entry.last_submission | date:'MMM d, h:mm a' }}
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"
              [ngClass]="{'rank-1': row.rank === 1, 'rank-2': row.rank === 2, 'rank-3': row.rank === 3}">
          </tr>
        </table>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }

    .table-container {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      background-color: var(--color-surface);
    }

    .leaderboard-table {
      width: 100%;
    }

    .rank-cell {
      width: 80px;
      text-align: center;
    }

    .rank-display {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      font-family: var(--font-display);
      font-size: var(--text-sm);
      font-weight: 700;
      border-radius: 50%;
      background-color: var(--color-surface-muted);
      color: var(--color-text-secondary);
    }

    .rank-gold {
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
      color: #451a03;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
    }

    .rank-silver {
      background: linear-gradient(135deg, #e5e7eb 0%, #9ca3af 100%);
      color: #1f2937;
      box-shadow: 0 2px 8px rgba(156, 163, 175, 0.4);
    }

    .rank-bronze {
      background: linear-gradient(135deg, #fcd9b6 0%, #c2855a 100%);
      color: #451a03;
      box-shadow: 0 2px 8px rgba(194, 133, 90, 0.4);
    }

    .user-cell {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background-color: var(--color-accent-light);
      color: var(--color-accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: var(--text-xs);
    }

    .user-name {
      font-weight: 500;
      color: var(--color-text-primary);
    }

    .user-team {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    .score-cell {
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--color-accent);
      font-size: var(--text-base);
    }

    .entries-cell,
    .date-cell {
      color: var(--color-text-muted);
      font-size: var(--text-sm);
    }

    tr.rank-1 {
      background-color: rgba(251, 191, 36, 0.08);
    }

    tr.rank-2 {
      background-color: rgba(156, 163, 175, 0.08);
    }

    tr.rank-3 {
      background-color: rgba(194, 133, 90, 0.08);
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

  getRankClass(rank: number): string {
    if (rank === 1) return 'rank-gold';
    if (rank === 2) return 'rank-silver';
    if (rank === 3) return 'rank-bronze';
    return '';
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}
