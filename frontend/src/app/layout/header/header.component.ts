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

      <!-- Desktop Navigation -->
      <nav class="navbar-nav desktop-nav">
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

      <div class="navbar-actions desktop-actions">
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

      <!-- Mobile Menu Button -->
      <button
        class="mobile-menu-btn"
        (click)="toggleMobileMenu()"
        [attr.aria-expanded]="mobileMenuOpen()"
        aria-label="Toggle navigation menu"
      >
        <span class="hamburger" [class.open]="mobileMenuOpen()">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>
    </header>

    <!-- Mobile Navigation Drawer -->
    @if (mobileMenuOpen()) {
      <div class="mobile-backdrop" (click)="closeMobileMenu()"></div>
      <nav class="mobile-nav" [class.open]="mobileMenuOpen()">
        <div class="mobile-nav-header">
          @if (auth.isAuthenticated()) {
            <div class="mobile-user-info">
              <div class="mobile-avatar">
                <mat-icon>account_circle</mat-icon>
              </div>
              <div class="mobile-user-details">
                <span class="mobile-user-name">{{ auth.currentUser()?.display_name }}</span>
                <span class="mobile-user-email">{{ auth.currentUser()?.email }}</span>
              </div>
            </div>
          } @else {
            <span class="mobile-nav-title">Menu</span>
          }
        </div>

        <div class="mobile-nav-links">
          <a
            routerLink="/competitions"
            routerLinkActive="active"
            class="mobile-nav-link"
            (click)="closeMobileMenu()"
          >
            <mat-icon>emoji_events</mat-icon>
            Competitions
          </a>

          @if (auth.isAuthenticated()) {
            <a
              routerLink="/dashboard"
              routerLinkActive="active"
              class="mobile-nav-link"
              (click)="closeMobileMenu()"
            >
              <mat-icon>dashboard</mat-icon>
              Dashboard
            </a>

            <a
              [routerLink]="['/users', auth.currentUser()?.username]"
              routerLinkActive="active"
              class="mobile-nav-link"
              (click)="closeMobileMenu()"
            >
              <mat-icon>person_outline</mat-icon>
              Profile
            </a>

            @if (canCreateCompetition()) {
              <a
                routerLink="/competitions/create"
                routerLinkActive="active"
                class="mobile-nav-link"
                (click)="closeMobileMenu()"
              >
                <mat-icon>add_circle_outline</mat-icon>
                Create Competition
              </a>
            }

            <div class="mobile-nav-divider"></div>

            <button class="mobile-nav-link logout" (click)="handleLogout()">
              <mat-icon>logout</mat-icon>
              Sign out
            </button>
          } @else {
            <div class="mobile-nav-divider"></div>

            <a
              routerLink="/login"
              class="mobile-nav-link"
              (click)="closeMobileMenu()"
            >
              <mat-icon>login</mat-icon>
              Login
            </a>

            <a
              routerLink="/register"
              class="mobile-nav-link highlight"
              (click)="closeMobileMenu()"
            >
              <mat-icon>person_add</mat-icon>
              Sign Up
            </a>
          }
        </div>
      </nav>
    }
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

    /* Mobile Menu Button */
    .mobile-menu-btn {
      display: none;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      padding: 0;
      background: none;
      border: none;
      cursor: pointer;
      border-radius: var(--radius-md);
      transition: background-color 150ms ease;

      &:hover {
        background-color: var(--color-surface-muted);
      }
    }

    .hamburger {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      width: 20px;
      height: 20px;
      position: relative;

      span {
        display: block;
        width: 18px;
        height: 2px;
        background-color: var(--color-text-primary);
        border-radius: 1px;
        position: absolute;
        transition: all 200ms ease;

        &:nth-child(1) {
          transform: translateY(-6px);
        }

        &:nth-child(2) {
          transform: translateY(0);
        }

        &:nth-child(3) {
          transform: translateY(6px);
        }
      }

      &.open span {
        &:nth-child(1) {
          transform: rotate(45deg);
        }

        &:nth-child(2) {
          opacity: 0;
        }

        &:nth-child(3) {
          transform: rotate(-45deg);
        }
      }
    }

    /* Mobile Backdrop */
    .mobile-backdrop {
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 299;
      animation: fadeIn 200ms ease-out;
    }

    /* Mobile Navigation Drawer */
    .mobile-nav {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 280px;
      max-width: calc(100vw - 60px);
      background-color: var(--color-surface);
      z-index: 300;
      display: flex;
      flex-direction: column;
      box-shadow: var(--shadow-xl);
      animation: slideInRight 250ms ease-out;
    }

    .mobile-nav-header {
      padding: var(--space-5);
      border-bottom: 1px solid var(--color-border);
    }

    .mobile-nav-title {
      font-family: var(--font-display);
      font-size: var(--text-lg);
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .mobile-user-info {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .mobile-avatar {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--color-surface-muted);
      border-radius: var(--radius-full);

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: var(--color-text-muted);
      }
    }

    .mobile-user-details {
      display: flex;
      flex-direction: column;
    }

    .mobile-user-name {
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .mobile-user-email {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    .mobile-nav-links {
      flex: 1;
      padding: var(--space-3);
      overflow-y: auto;
    }

    .mobile-nav-link {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      padding: var(--space-3) var(--space-4);
      font-family: var(--font-body);
      font-size: var(--text-base);
      font-weight: 500;
      color: var(--color-text-secondary);
      text-decoration: none;
      background: none;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 150ms ease;
      text-align: left;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: var(--color-text-muted);
        transition: color 150ms ease;
      }

      &:hover {
        color: var(--color-text-primary);
        background-color: var(--color-surface-muted);

        mat-icon {
          color: var(--color-text-secondary);
        }
      }

      &.active {
        color: var(--color-accent);
        background-color: var(--color-accent-light);

        mat-icon {
          color: var(--color-accent);
        }
      }

      &.highlight {
        color: var(--color-accent);

        mat-icon {
          color: var(--color-accent);
        }
      }

      &.logout {
        color: var(--color-error);

        mat-icon {
          color: var(--color-error);
        }

        &:hover {
          background-color: var(--color-error-light);
        }
      }
    }

    .mobile-nav-divider {
      height: 1px;
      background-color: var(--color-border);
      margin: var(--space-2) var(--space-4);
    }

    /* Animations */
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    /* Responsive - Hide desktop nav on mobile */
    @media (max-width: 767px) {
      .navbar {
        padding: 0 var(--space-4);
      }

      .desktop-nav,
      .desktop-actions {
        display: none;
      }

      .mobile-menu-btn {
        display: flex;
      }
    }
  `],
})
export class HeaderComponent implements OnInit {
  unreadCount = signal(0);
  mobileMenuOpen = signal(false);

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

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(open => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  handleLogout(): void {
    this.closeMobileMenu();
    this.auth.logout();
  }
}
