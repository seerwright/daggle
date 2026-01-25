import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent],
  template: `
    <div class="app-container">
      <app-header />
      <main class="main-content">
        <router-outlet />
      </main>
      <footer class="footer">
        <span>Daggle - Internal Data Science Platform</span>
      </footer>
    </div>
  `,
  styles: [`
    .app-container {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    .main-content {
      flex: 1;
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
      width: 100%;
      box-sizing: border-box;
    }
    .footer {
      background: #f5f5f5;
      padding: 24px;
      text-align: center;
      color: #666;
      font-size: 0.875rem;
      border-top: 1px solid #e0e0e0;
    }
  `],
})
export class LayoutComponent {}
