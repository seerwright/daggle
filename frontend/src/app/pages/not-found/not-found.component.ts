import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="not-found">
      <mat-icon class="icon">search_off</mat-icon>
      <h1>404</h1>
      <p>Page not found</p>
      <a mat-flat-button color="primary" routerLink="/">
        Go Home
      </a>
    </div>
  `,
  styles: [`
    .not-found {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      text-align: center;
    }
    .icon {
      font-size: 72px;
      width: 72px;
      height: 72px;
      color: #ccc;
    }
    h1 {
      font-size: 4rem;
      margin: 16px 0 8px;
      color: #333;
    }
    p {
      color: #666;
      margin-bottom: 24px;
    }
  `],
})
export class NotFoundComponent {}
