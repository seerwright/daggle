import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule],
  template: `
    <div class="hero">
      <h1>Welcome to Daggle</h1>
      <p>Your internal platform for data science competitions</p>
      <a mat-flat-button color="primary" routerLink="/competitions">
        Browse Competitions
      </a>
    </div>

    <div class="features">
      <mat-card>
        <mat-card-content>
          <mat-icon class="feature-icon">emoji_events</mat-icon>
          <h3>Compete</h3>
          <p>Join competitions and test your machine learning skills against colleagues.</p>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-content>
          <mat-icon class="feature-icon">school</mat-icon>
          <h3>Learn</h3>
          <p>Improve your skills by working on real-world datasets and problems.</p>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-content>
          <mat-icon class="feature-icon">groups</mat-icon>
          <h3>Collaborate</h3>
          <p>Form teams and work together to build better models.</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .hero {
      text-align: center;
      padding: 64px 0;
    }
    .hero h1 {
      font-size: 3rem;
      margin-bottom: 16px;
    }
    .hero p {
      font-size: 1.25rem;
      color: #666;
      margin-bottom: 32px;
    }
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
      margin-top: 48px;
    }
    .features mat-card-content {
      text-align: center;
      padding: 24px 16px;
    }
    .feature-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #1976d2;
      margin-bottom: 16px;
    }
    .features h3 {
      margin: 0 0 8px;
      font-size: 1.25rem;
    }
    .features p {
      color: #666;
      margin: 0;
    }
  `],
})
export class HomeComponent {}
