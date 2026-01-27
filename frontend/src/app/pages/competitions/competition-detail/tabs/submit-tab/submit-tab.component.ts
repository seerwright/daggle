import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Competition } from '../../../../../core/models/competition.model';
import { SubmitComponent } from '../../../submit/submit.component';

@Component({
  selector: 'app-submit-tab',
  standalone: true,
  imports: [CommonModule, MatIconModule, SubmitComponent],
  template: `
    <div class="submit-tab">
      @if (isEnrolled) {
        <app-submit [slug]="slug" [competition]="competition"></app-submit>
      } @else {
        <div class="empty-state">
          <mat-icon class="empty-icon">upload_file</mat-icon>
          <h3 class="empty-title">Join to submit</h3>
          <p class="empty-description">
            You must join this competition before submitting predictions.
          </p>
        </div>
      }
    </div>
  `,
  styles: [`
    .submit-tab {
      padding: var(--space-6) 0;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      padding: var(--space-12);
      text-align: center;
    }

    .empty-icon {
      font-size: 56px;
      width: 56px;
      height: 56px;
      color: var(--color-text-muted);
      margin-bottom: var(--space-4);
    }

    .empty-title {
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-2);
    }

    .empty-description {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin: 0;
    }

    @media (max-width: 480px) {
      .submit-tab {
        padding: var(--space-4) 0;
      }
    }
  `],
})
export class SubmitTabComponent {
  @Input({ required: true }) slug!: string;
  @Input({ required: true }) competition!: Competition;
  @Input() isEnrolled = false;
}
