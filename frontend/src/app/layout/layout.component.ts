import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent],
  template: `
    <div class="app-layout">
      <app-header />
      <main class="main-content">
        <div class="container">
          <router-outlet />
        </div>
      </main>
      <footer class="footer">
        <div class="footer-content">
          <span class="footer-brand">Daggle</span>
          <span class="footer-separator">·</span>
          <span>Internal Data Science Platform</span>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background-color: var(--color-background);
    }

    .main-content {
      flex: 1;
      padding: var(--space-8) 0;
    }

    .container {
      max-width: var(--container-max);
      margin: 0 auto;
      padding: 0 var(--space-6);
    }

    .footer {
      padding: var(--space-6);
      background-color: var(--color-surface-muted);
      border-top: 1px solid var(--color-border);
    }

    .footer-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .footer-brand {
      font-family: var(--font-display);
      font-weight: var(--font-semibold);
      color: var(--color-text-secondary);
    }

    .footer-separator {
      color: var(--color-border-strong);
    }
  `],
})
export class LayoutComponent {}
