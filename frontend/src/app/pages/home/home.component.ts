import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatCardModule],
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
        <mat-card-header>
          <mat-card-title>Compete</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>Join competitions and test your machine learning skills against colleagues.</p>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-header>
          <mat-card-title>Learn</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>Improve your skills by working on real-world datasets and problems.</p>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-header>
          <mat-card-title>Collaborate</mat-card-title>
        </mat-card-header>
        <mat-card-content>
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
  `],
})
export class HomeComponent {}
