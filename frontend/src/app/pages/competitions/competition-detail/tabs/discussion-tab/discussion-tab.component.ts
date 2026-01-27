import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DiscussionsComponent } from '../../../discussions/discussions.component';

@Component({
  selector: 'app-discussion-tab',
  standalone: true,
  imports: [CommonModule, DiscussionsComponent],
  template: `
    <div class="discussion-tab">
      <app-discussions [slug]="slug" [canPost]="canPost"></app-discussions>
    </div>
  `,
  styles: [`
    .discussion-tab {
      padding: var(--space-6) 0;
    }

    @media (max-width: 480px) {
      .discussion-tab {
        padding: var(--space-4) 0;
      }
    }
  `],
})
export class DiscussionTabComponent {
  @Input({ required: true }) slug!: string;
  @Input() canPost = false;
}
