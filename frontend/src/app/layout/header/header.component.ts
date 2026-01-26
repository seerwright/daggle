import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

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
    MatBadgeModule,
    MatDividerModule,
  ],
  template: `
    <mat-toolbar color="primary">
      <a routerLink="/" class="logo">Daggle</a>
      <span class="spacer"></span>

      <a mat-button routerLink="/competitions">Competitions</a>

      @if (auth.isAuthenticated()) {
        <a mat-button routerLink="/dashboard">Dashboard</a>
        @if (canCreateCompetition()) {
          <a mat-button routerLink="/competitions/create">Create Competition</a>
        }

        <button
          mat-icon-button
          [matBadge]="unreadCount()"
          [matBadgeHidden]="unreadCount() === 0"
          matBadgeColor="accent"
          matBadgeSize="small"
          routerLink="/dashboard"
          title="Notifications"
        >
          <mat-icon>notifications</mat-icon>
        </button>

        <button mat-icon-button [matMenuTriggerFor]="userMenu">
          <mat-icon>account_circle</mat-icon>
        </button>
        <mat-menu #userMenu="matMenu">
          <div class="user-info">
            {{ auth.currentUser()?.display_name }}
          </div>
          <button mat-menu-item [routerLink]="['/users', auth.currentUser()?.username]">
            <mat-icon>person</mat-icon>
            Profile
          </button>
          <button mat-menu-item routerLink="/dashboard">
            <mat-icon>dashboard</mat-icon>
            Dashboard
          </button>
          <mat-divider></mat-divider>
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
export class HeaderComponent implements OnInit {
  unreadCount = signal(0);

  constructor(
    public auth: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    // Load unread count when authenticated
    if (this.auth.isAuthenticated()) {
      this.loadUnreadCount();
    }
  }

  private loadUnreadCount() {
    this.notificationService.getUnreadCount().subscribe({
      next: (response) => {
        this.unreadCount.set(response.unread_count);
      },
      error: () => {
        // Silently fail - not critical
      },
    });
  }

  canCreateCompetition(): boolean {
    const user = this.auth.currentUser();
    return user !== null && (user.role === 'sponsor' || user.role === 'admin');
  }
}
