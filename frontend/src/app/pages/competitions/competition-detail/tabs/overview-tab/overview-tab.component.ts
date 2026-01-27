import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Competition } from '../../../../../core/models/competition.model';

@Component({
  selector: 'app-overview-tab',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overview-tab">
      <section class="overview-section">
        <h2 class="section-title">Description</h2>
        <div class="section-content">
          <p class="description-text">{{ competition.description }}</p>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .overview-tab {
      padding: var(--space-6) 0;
    }

    .overview-section {
      margin-bottom: var(--space-8);

      &:last-child {
        margin-bottom: 0;
      }
    }

    .section-title {
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-4);
    }

    .description-text {
      white-space: pre-wrap;
      color: var(--color-text-secondary);
      line-height: var(--leading-relaxed);
      margin: 0;
    }

    @media (max-width: 480px) {
      .overview-tab {
        padding: var(--space-4) 0;
      }
    }
  `],
})
export class OverviewTabComponent {
  @Input({ required: true }) competition!: Competition;
}
