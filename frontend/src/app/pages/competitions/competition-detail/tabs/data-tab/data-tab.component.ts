import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-data-tab',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="data-tab">
      <div class="placeholder-state">
        <mat-icon class="placeholder-icon">folder_open</mat-icon>
        <h3 class="placeholder-title">Data Files</h3>
        <p class="placeholder-description">
          Competition data files and documentation will appear here.
        </p>
      </div>
    </div>
  `,
  styles: [`
    .data-tab {
      padding: var(--space-6) 0;
    }

    .placeholder-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      padding: var(--space-12);
      text-align: center;
      background-color: var(--color-surface);
      border: 2px dashed var(--color-border);
      border-radius: var(--radius-lg);
    }

    .placeholder-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--color-text-muted);
      margin-bottom: var(--space-4);
    }

    .placeholder-title {
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-2);
    }

    .placeholder-description {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin: 0;
      max-width: 320px;
    }

    @media (max-width: 480px) {
      .data-tab {
        padding: var(--space-4) 0;
      }

      .placeholder-state {
        padding: var(--space-8);
        min-height: 200px;
      }
    }
  `],
})
export class DataTabComponent {
  @Input({ required: true }) slug!: string;
}
