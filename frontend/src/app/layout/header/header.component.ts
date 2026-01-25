import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
  ],
  template: `
    <mat-toolbar color="primary">
      <a routerLink="/" class="logo">Daggle</a>
      <span class="spacer"></span>

      <a mat-button routerLink="/competitions">Competitions</a>

      @if (auth.isAuthenticated()) {
        <button mat-icon-button [matMenuTriggerFor]="userMenu">
          <mat-icon>account_circle</mat-icon>
        </button>
        <mat-menu #userMenu="matMenu">
          <div class="user-info">
            {{ auth.currentUser()?.display_name }}
          </div>
          <button mat-menu-item routerLink="/profile">
            <mat-icon>person</mat-icon>
            Profile
          </button>
          <button mat-menu-item (click)="auth.logout()">
            <mat-icon>logout</mat-icon>
            Logout
          </button>
        </mat-menu>
      } @else {
        <a mat-button routerLink="/login">Login</a>
        <a mat-flat-button routerLink="/register">Sign Up</a>
      }
    </mat-toolbar>
  `,
  styles: [`
    .logo {
      font-size: 1.5rem;
      font-weight: 600;
      text-decoration: none;
      color: inherit;
    }
    .spacer {
      flex: 1;
    }
    .user-info {
      padding: 8px 16px;
      font-weight: 500;
      border-bottom: 1px solid #eee;
    }
  `],
})
export class HeaderComponent {
  constructor(public auth: AuthService) {}
}
