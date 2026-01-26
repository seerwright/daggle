import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
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
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="competitions-page">
      <header class="page-header">
        <h1 class="page-title">Competitions</h1>
      </header>

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
        </div>
      } @else {
        <div class="competition-grid">
          @for (comp of competitions; track comp.id) {
            <article class="competition-card" [routerLink]="['/competitions', comp.slug]">
              <div class="competition-card-body">
                <h3 class="competition-card-title">{{ comp.title }}</h3>
                <div class="competition-card-meta">
                  <span class="status-badge" [class]="'status-' + comp.status">
                    {{ comp.status }}
                  </span>
                  <span class="difficulty-badge" [class]="'difficulty-' + comp.difficulty">
                    {{ comp.difficulty }}
                  </span>
                </div>
                <p class="competition-card-description">{{ comp.short_description }}</p>
              </div>
              <footer class="competition-card-footer">
                <span>Starts: {{ comp.start_date | date:'mediumDate' }}</span>
                <span>Ends: {{ comp.end_date | date:'mediumDate' }}</span>
              </footer>
            </article>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
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
