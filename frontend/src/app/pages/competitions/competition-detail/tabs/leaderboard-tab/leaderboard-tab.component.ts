import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeaderboardComponent } from '../../../leaderboard/leaderboard.component';

@Component({
  selector: 'app-leaderboard-tab',
  standalone: true,
  imports: [CommonModule, LeaderboardComponent],
  template: `
    <div class="leaderboard-tab">
      <app-leaderboard [slug]="slug"></app-leaderboard>
    </div>
  `,
  styles: [`
    .leaderboard-tab {
      padding: var(--space-6) 0;
    }

    @media (max-width: 480px) {
      .leaderboard-tab {
        padding: var(--space-4) 0;
      }
    }
  `],
})
export class LeaderboardTabComponent {
  @Input({ required: true }) slug!: string;
}
