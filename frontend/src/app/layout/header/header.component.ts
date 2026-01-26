import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
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
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule,
  ],
  template: `
    <header class="navbar">
      <a routerLink="/" class="navbar-brand">Daggle</a>
      <span class="navbar-spacer"></span>

      <nav class="navbar-nav">
        <a routerLink="/competitions" routerLinkActive="active" class="navbar-link">
          Competitions
        </a>

        @if (auth.isAuthenticated()) {
          <a routerLink="/dashboard" routerLinkActive="active" class="navbar-link">
            Dashboard
          </a>
          @if (canCreateCompetition()) {
            <a routerLink="/competitions/create" routerLinkActive="active" class="navbar-link">
              Create
            </a>
          }
        }
      </nav>

      <div class="navbar-actions">
        @if (auth.isAuthenticated()) {
          <button
            mat-icon-button
            class="notification-btn"
            [matBadge]="unreadCount()"
            [matBadgeHidden]="unreadCount() === 0"
            matBadgeColor="warn"
            matBadgeSize="small"
            routerLink="/dashboard"
            title="Notifications"
          >
            <mat-icon>notifications_none</mat-icon>
          </button>

          <button mat-icon-button [matMenuTriggerFor]="userMenu" class="user-btn">
            <mat-icon>account_circle</mat-icon>
          </button>
          <mat-menu #userMenu="matMenu">
            <div class="user-menu-header">
              <span class="user-name">{{ auth.currentUser()?.display_name }}</span>
              <span class="user-email">{{ auth.currentUser()?.email }}</span>
            </div>
            <mat-divider></mat-divider>
            <button mat-menu-item [routerLink]="['/users', auth.currentUser()?.username]">
              <mat-icon>person_outline</mat-icon>
              Profile
            </button>
            <button mat-menu-item routerLink="/dashboard">
              <mat-icon>dashboard</mat-icon>
              Dashboard
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="auth.logout()" class="logout-item">
              <mat-icon>logout</mat-icon>
              Sign out
            </button>
          </mat-menu>
        } @else {
          <a routerLink="/login" class="navbar-link">Login</a>
          <a routerLink="/register" class="btn btn-primary btn-sm">Sign Up</a>
        }
      </div>
    </header>
  `,
  styles: [`
    .navbar {
      position: sticky;
      top: 0;
      z-index: 200;
      display: flex;
      align-items: center;
      height: 64px;
      padding: 0 var(--space-6);
      background-color: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
    }

    .navbar-brand {
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: 700;
      color: var(--color-text-primary);
      text-decoration: none;
      transition: color 150ms ease;

      &:hover {
        color: var(--color-accent);
      }
    }

    .navbar-spacer {
      flex: 1;
    }

    .navbar-nav {
      display: flex;
      align-items: center;
      gap: var(--space-1);
    }

    .navbar-link {
      display: inline-flex;
      align-items: center;
      padding: var(--space-2) var(--space-3);
      font-size: var(--text-sm);
      font-weight: 500;
      color: var(--color-text-secondary);
      text-decoration: none;
      border-radius: var(--radius-md);
      transition: all 150ms ease;

      &:hover {
        color: var(--color-text-primary);
        background-color: var(--color-surface-muted);
      }

      &.active {
        color: var(--color-accent);
        background-color: var(--color-accent-light);
      }
    }

    .navbar-actions {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      margin-left: var(--space-4);
    }

    .notification-btn,
    .user-btn {
      color: var(--color-text-secondary);

      &:hover {
        color: var(--color-text-primary);
      }
    }

    .user-menu-header {
      padding: var(--space-3) var(--space-4);
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .user-name {
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .user-email {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    .logout-item {
      color: var(--color-error);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-2) var(--space-4);
      font-size: var(--text-sm);
      font-weight: 500;
      text-decoration: none;
      border-radius: var(--radius-md);
      transition: all 150ms ease;
    }

    .btn-primary {
      background-color: var(--color-accent);
      color: white;

      &:hover {
        background-color: var(--color-accent-hover);
      }
    }

    .btn-sm {
      padding: var(--space-2) var(--space-3);
      font-size: var(--text-xs);
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
