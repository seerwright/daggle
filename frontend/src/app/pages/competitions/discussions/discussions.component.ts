import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  DiscussionService,
  Thread,
  Reply,
} from '../../../core/services/discussion.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-discussions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatSnackBarModule,
  ],
  template: `
    @if (loading) {
      <div class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else if (selectedThread) {
      <!-- Thread Detail View -->
      <div class="thread-detail">
        <button mat-button (click)="closeThread()">
          <mat-icon>arrow_back</mat-icon>
          Back to discussions
        </button>

        <mat-card class="thread-card">
          <mat-card-header>
            <mat-card-title>
              @if (selectedThread.is_pinned) {
                <mat-icon class="pin-icon">push_pin</mat-icon>
              }
              {{ selectedThread.title }}
              @if (selectedThread.is_locked) {
                <mat-icon class="lock-icon">lock</mat-icon>
              }
            </mat-card-title>
            <mat-card-subtitle>
              {{ selectedThread.author.display_name }} ·
              {{ selectedThread.created_at | date: 'medium' }}
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p class="thread-content">{{ selectedThread.content }}</p>
          </mat-card-content>
        </mat-card>

        <div class="replies-section">
          <h3>Replies ({{ selectedThread.replies?.length || 0 }})</h3>

          @for (reply of selectedThread.replies; track reply.id) {
            <mat-card class="reply-card">
              <mat-card-content>
                <div class="reply-header">
                  <strong>{{ reply.author.display_name }}</strong>
                  <span class="reply-date">{{
                    reply.created_at | date: 'medium'
                  }}</span>
                </div>
                <p class="reply-content">{{ reply.content }}</p>
              </mat-card-content>
            </mat-card>
          }

          @if (!selectedThread.is_locked && canPost) {
            <mat-card class="reply-form-card">
              <mat-card-content>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Write a reply</mat-label>
                  <textarea
                    matInput
                    [(ngModel)]="newReplyContent"
                    rows="3"
                    placeholder="Share your thoughts..."
                  ></textarea>
                </mat-form-field>
                <button
                  mat-flat-button
                  color="primary"
                  [disabled]="!newReplyContent.trim() || submitting"
                  (click)="submitReply()"
                >
                  {{ submitting ? 'Posting...' : 'Post Reply' }}
                </button>
              </mat-card-content>
            </mat-card>
          } @else if (selectedThread.is_locked) {
            <p class="locked-notice">This thread is locked. No new replies.</p>
          }
        </div>
      </div>
    } @else {
      <!-- Thread List View -->
      <div class="discussions-header">
        <h3>Discussions ({{ total }})</h3>
        @if (canPost) {
          <button mat-flat-button color="primary" (click)="showNewThreadForm = true">
            <mat-icon>add</mat-icon>
            New Thread
          </button>
        }
      </div>

      @if (showNewThreadForm) {
        <mat-card class="new-thread-form">
          <mat-card-content>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Thread Title</mat-label>
              <input
                matInput
                [(ngModel)]="newThreadTitle"
                placeholder="What's your question or topic?"
              />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Content</mat-label>
              <textarea
                matInput
                [(ngModel)]="newThreadContent"
                rows="4"
                placeholder="Provide details..."
              ></textarea>
            </mat-form-field>
            <div class="form-actions">
              <button mat-button (click)="showNewThreadForm = false">Cancel</button>
              <button
                mat-flat-button
                color="primary"
                [disabled]="!newThreadTitle.trim() || !newThreadContent.trim() || submitting"
                (click)="submitThread()"
              >
                {{ submitting ? 'Creating...' : 'Create Thread' }}
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      }

      @if (threads.length === 0) {
        <p class="no-threads">No discussions yet. Be the first to start a conversation!</p>
      } @else {
        <div class="thread-list">
          @for (thread of threads; track thread.id) {
            <mat-card class="thread-item" (click)="openThread(thread)">
              <mat-card-content>
                <div class="thread-title">
                  @if (thread.is_pinned) {
                    <mat-icon class="pin-icon">push_pin</mat-icon>
                  }
                  {{ thread.title }}
                  @if (thread.is_locked) {
                    <mat-icon class="lock-icon">lock</mat-icon>
                  }
                </div>
                <div class="thread-meta">
                  <span>{{ thread.author.display_name }}</span>
                  <span>·</span>
                  <span>{{ thread.created_at | date: 'shortDate' }}</span>
                  <span>·</span>
                  <span>{{ thread.reply_count }} replies</span>
                </div>
              </mat-card-content>
            </mat-card>
          }
        </div>
      }
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .competition-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--space-12);
        color: var(--color-text-muted);
      }

      .loading-text {
        margin-top: var(--space-4);
        font-size: var(--text-sm);
      }

      .discussions-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-5);
      }

      .discussions-header h3 {
        font-family: var(--font-display);
        font-size: var(--text-lg);
        font-weight: 600;
        margin: 0;
        color: var(--color-text-primary);
      }

      .thread-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }

      .thread-item {
        padding: var(--space-4);
        background-color: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: all var(--transition-fast);
      }

      .thread-item:hover {
        border-color: var(--color-border-strong);
        box-shadow: var(--shadow-sm);
      }

      .thread-title {
        font-weight: 500;
        font-size: var(--text-base);
        color: var(--color-text-primary);
        margin-bottom: var(--space-2);
        display: flex;
        align-items: center;
        gap: var(--space-2);
      }

      .thread-meta {
        font-size: var(--text-sm);
        color: var(--color-text-muted);
        display: flex;
        gap: var(--space-2);
      }

      .pin-icon {
        color: var(--color-accent);
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      .lock-icon {
        color: var(--color-text-muted);
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      .no-threads {
        text-align: center;
        color: var(--color-text-muted);
        padding: var(--space-12);
      }

      .new-thread-form {
        margin-bottom: var(--space-5);
        background-color: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
      }

      .full-width {
        width: 100%;
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-3);
        margin-top: var(--space-3);
      }

      .thread-detail button[mat-button] {
        margin-bottom: var(--space-4);
        color: var(--color-text-secondary);
      }

      .thread-card {
        margin-bottom: var(--space-6);
        background-color: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
      }

      .thread-content {
        white-space: pre-wrap;
        line-height: var(--leading-relaxed);
        color: var(--color-text-secondary);
      }

      .replies-section h3 {
        font-family: var(--font-display);
        font-size: var(--text-lg);
        font-weight: 600;
        margin-bottom: var(--space-4);
        color: var(--color-text-primary);
      }

      .reply-card {
        margin-bottom: var(--space-3);
        background-color: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
      }

      .reply-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-2);
      }

      .reply-header strong {
        color: var(--color-text-primary);
      }

      .reply-date {
        font-size: var(--text-sm);
        color: var(--color-text-muted);
      }

      .reply-content {
        margin: 0;
        white-space: pre-wrap;
        color: var(--color-text-secondary);
        line-height: var(--leading-relaxed);
      }

      .reply-form-card {
        margin-top: var(--space-5);
        background-color: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
      }

      .locked-notice {
        text-align: center;
        color: var(--color-text-muted);
        font-style: italic;
        margin-top: var(--space-5);
        padding: var(--space-4);
        background-color: var(--color-surface-muted);
        border-radius: var(--radius-md);
      }
    `,
  ],
})
export class DiscussionsComponent implements OnInit {
  @Input() slug = '';
  @Input() canPost = false;

  threads: Thread[] = [];
  selectedThread: Thread | null = null;
  total = 0;
  loading = true;
  submitting = false;

  showNewThreadForm = false;
  newThreadTitle = '';
  newThreadContent = '';
  newReplyContent = '';

  constructor(
    private discussionService: DiscussionService,
    private snackBar: MatSnackBar,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadThreads();
  }

  loadThreads(): void {
    this.loading = true;
    this.discussionService.getThreads(this.slug).subscribe({
      next: (response) => {
        this.threads = response.threads;
        this.total = response.total;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  openThread(thread: Thread): void {
    this.loading = true;
    this.discussionService.getThread(this.slug, thread.id).subscribe({
      next: (fullThread) => {
        this.selectedThread = fullThread;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load thread', 'Close', { duration: 3000 });
      },
    });
  }

  closeThread(): void {
    this.selectedThread = null;
    this.newReplyContent = '';
    this.loadThreads();
  }

  submitThread(): void {
    if (!this.newThreadTitle.trim() || !this.newThreadContent.trim()) return;

    this.submitting = true;
    this.discussionService
      .createThread(this.slug, {
        title: this.newThreadTitle,
        content: this.newThreadContent,
      })
      .subscribe({
        next: (thread) => {
          this.submitting = false;
          this.showNewThreadForm = false;
          this.newThreadTitle = '';
          this.newThreadContent = '';
          this.snackBar.open('Thread created!', 'Close', { duration: 3000 });
          this.loadThreads();
        },
        error: (err) => {
          this.submitting = false;
          this.snackBar.open(
            err.error?.detail || 'Failed to create thread',
            'Close',
            { duration: 5000 }
          );
        },
      });
  }

  submitReply(): void {
    if (!this.newReplyContent.trim() || !this.selectedThread) return;

    this.submitting = true;
    this.discussionService
      .createReply(this.slug, this.selectedThread.id, {
        content: this.newReplyContent,
      })
      .subscribe({
        next: (reply) => {
          this.submitting = false;
          this.newReplyContent = '';
          if (this.selectedThread?.replies) {
            this.selectedThread.replies.push(reply);
          }
          this.snackBar.open('Reply posted!', 'Close', { duration: 3000 });
        },
        error: (err) => {
          this.submitting = false;
          this.snackBar.open(
            err.error?.detail || 'Failed to post reply',
            'Close',
            { duration: 5000 }
          );
        },
      });
  }
}
