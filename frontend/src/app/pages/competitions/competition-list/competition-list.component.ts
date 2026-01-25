import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CompetitionService } from '../../../core/services/competition.service';
import { CompetitionListItem } from '../../../core/models/competition.model';

@Component({
  selector: 'app-competition-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h1>Competitions</h1>

    @if (loading) {
      <div class="loading">
        <mat-spinner></mat-spinner>
      </div>
    } @else if (competitions.length === 0) {
      <p class="empty">No competitions available yet.</p>
    } @else {
      <div class="competition-grid">
        @for (comp of competitions; track comp.id) {
          <mat-card class="competition-card" [routerLink]="['/competitions', comp.slug]">
            <mat-card-header>
              <mat-card-title>{{ comp.title }}</mat-card-title>
              <mat-card-subtitle>
                <mat-chip-set>
                  <mat-chip [class]="'status-' + comp.status">
                    {{ comp.status }}
                  </mat-chip>
                  <mat-chip [class]="'difficulty-' + comp.difficulty">
                    {{ comp.difficulty }}
                  </mat-chip>
                </mat-chip-set>
              </mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>{{ comp.short_description }}</p>
              <div class="dates">
                <span>Starts: {{ comp.start_date | date:'mediumDate' }}</span>
                <span>Ends: {{ comp.end_date | date:'mediumDate' }}</span>
              </div>
            </mat-card-content>
          </mat-card>
        }
      </div>
    }
  `,
  styles: [`
    h1 {
      margin-bottom: 24px;
    }
    .loading, .empty {
      text-align: center;
      padding: 64px;
    }
    .competition-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 24px;
    }
    .competition-card {
      cursor: pointer;
      transition: box-shadow 0.2s;
    }
    .competition-card:hover {
      box-shadow: 0 4px 20px rgba(0,0,0,0.12);
    }
    .dates {
      display: flex;
      justify-content: space-between;
      margin-top: 16px;
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
    .status-completed {
      background-color: #2196f3 !important;
      color: white !important;
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
  `],
})
export class CompetitionListComponent implements OnInit {
  competitions: CompetitionListItem[] = [];
  loading = true;

  constructor(private competitionService: CompetitionService) {}

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
}
