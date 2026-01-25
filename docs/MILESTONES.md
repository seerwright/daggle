# Daggle Development Milestones

## Overview

This document outlines the sequenced development plan for Daggle's next phase. Each milestone delivers user-visible value while maintaining system stability.

**Guiding Principles:**
- Maintainability over speed
- Each merge to master leaves the system runnable and coherent
- One feature branch per milestone
- Tests included with each milestone, not deferred

---

## Phase 1: Core Loop Value ✅ COMPLETE

### Milestone 1.1: Discussions ✅

**Branch:** `feature/12-discussions` (merged)
**Completed:** 2026-01-25

**Scope:**
- Per-competition discussion threads (Q&A style)
- Thread creation by enrolled users
- Replies to threads
- Basic moderation hooks (lock/pin fields, enforcement stubbed)

**Key Deliverables:**
- `DiscussionThread` model with title, content, author, competition, pinned, locked flags
- `DiscussionReply` model with content, author, thread reference
- API endpoints:
  - `GET /competitions/{slug}/discussions` - list threads
  - `POST /competitions/{slug}/discussions` - create thread
  - `GET /competitions/{slug}/discussions/{id}` - get thread with replies
  - `POST /competitions/{slug}/discussions/{id}/replies` - add reply
- Frontend: Discussions tab on competition detail page
- Thread list view, thread detail view with reply form

**Definition of Done:**
- [x] Models created with migrations
- [x] API endpoints functional
- [x] Frontend displays real data (no mocks)
- [x] Integration tests for thread/reply CRUD (10 tests)
- [x] Enrolled users can create threads; all users can view

**Assumptions:**
- No nested replies (flat thread structure)
- No markdown rendering initially (plain text)
- Lock/pin stored but not enforced in v1

---

### Milestone 1.2: Leaderboard ✅

**Branch:** `feature/13-leaderboard` (merged)
**Completed:** 2026-01-25

**Scope:**
- Ranking based on best submission score per user
- Leaderboard display on competition detail page
- Public/private split: public shows all, private shows user's position

**Key Deliverables:**
- API endpoint: `GET /competitions/{slug}/leaderboard`
- Query logic: best score per user, ranked by metric direction
- Response includes rank, username, score, submission count, last submission date
- Frontend: Leaderboard tab on competition detail
- Public leaderboard table with pagination
- Highlight current user's row if enrolled

**Definition of Done:**
- [x] Leaderboard API returns ranked entries
- [x] Handles tie-breaks (earlier submission wins)
- [x] Respects metric direction (higher/lower is better)
- [x] Frontend displays leaderboard with real data (already existed)
- [x] Integration tests for ranking logic (7 tests)

**Assumptions:**
- Single-user leaderboard (teams come later)
- No caching initially (acceptable for <1000 users per competition)

---

## Phase 2: Platform Primitive ✅ COMPLETE

### Milestone 2.1: File Storage Abstraction ✅

**Branch:** `feature/14-storage` (merged)
**Completed:** 2026-01-25

**Scope:**
- Abstract storage interface for files
- Local filesystem implementation (existing behavior)
- S3/MinIO implementation
- Wire submissions and datasets through abstraction

**Key Deliverables:**
- `StorageBackend` protocol/interface
- `LocalStorageBackend` implementation using aiofiles
- `S3StorageBackend` implementation using aioboto3
- Configuration via environment variables
- MinIO service in docker-compose (with s3 profile)
- Submission uploads wired through abstraction

**Definition of Done:**
- [x] Storage interface defined (`StorageBackend` protocol)
- [x] Local backend works (existing behavior preserved)
- [x] S3 backend works with MinIO in docker-compose
- [x] Submissions use storage abstraction
- [x] Integration tests for local backend (12 tests)
- [x] S3 tests available (skipped when MinIO not running)

**Configuration:**
- `STORAGE_BACKEND`: "local" (default) or "s3"
- `S3_ENDPOINT_URL`: MinIO/S3 endpoint (e.g., "http://minio:9000")
- `S3_BUCKET`: Bucket name (default: "daggle")
- `S3_ACCESS_KEY`, `S3_SECRET_KEY`: Credentials

**Usage:**
```bash
# Local storage (default)
docker compose up

# S3/MinIO storage
docker compose --profile s3 up
# Then set STORAGE_BACKEND=s3 and other S3_* vars
```

**Dependencies:**
- None

**Risks:**
- Existing local file paths preserved via configurable base directory

---

## Phase 3: Async Processing ✅ COMPLETE

### Milestone 3.1: Background Jobs for Scoring ✅

**Branch:** `feature/15-async-scoring` (merged)
**Completed:** 2026-01-25

**Scope:**
- Async job execution with Celery + Redis
- Submission lifecycle: pending → processing → scored/failed
- Idempotent scoring jobs
- Synchronous fallback for simple deployments

**Key Deliverables:**
- Celery application configuration (`src/infrastructure/tasks/`)
- Redis service in docker-compose (with async profile)
- `score_submission_task` Celery task
- Submission status: PENDING → PROCESSING → SCORED/FAILED
- Async scoring enabled via `ASYNC_SCORING_ENABLED` config
- Error capture and automatic retry logic (3 retries with backoff)

**Definition of Done:**
- [x] Celery worker runs in docker-compose (`--profile async`)
- [x] Submissions queued via `score_submission_task.delay()`
- [x] Status updates (PROCESSING while scoring)
- [x] Failed jobs have error messages stored
- [x] Synchronous scoring works when `ASYNC_SCORING_ENABLED=false`
- [x] Integration tests for async flow (10 tests)

**Configuration:**
- `ASYNC_SCORING_ENABLED`: "false" (default) or "true"
- `CELERY_BROKER_URL`: Redis URL (default: "redis://localhost:6379/0")
- `CELERY_RESULT_BACKEND`: Redis URL for results

**Usage:**
```bash
# Synchronous scoring (default)
docker compose up

# Async scoring with Celery + Redis
docker compose --profile async up
```

**Dependencies:**
- Storage abstraction (Milestone 2.1) - for file loading in background task

---

## Phase 4: User Awareness & Personalization

### Milestone 4.1: Notifications ✅

**Branch:** `feature/16-notifications` (merged)
**Completed:** 2026-01-25

**Scope:**
- In-app notifications (no email)
- Triggers: submission scored/failed, discussion replies
- Simple notification model with read status

**Key Deliverables:**
- `Notification` model with type enum, title, message, link, read status
- `NotificationService` with trigger helpers for common notification types
- `NotificationRepository` with unread filtering and mark-as-read operations
- Automatic triggers in:
  - SubmissionService (scored/failed notifications)
  - DiscussionService (reply notifications to thread authors)
  - Scoring task (async scoring notifications)
- API endpoints:
  - `GET /notifications` - list notifications with unread count
  - `GET /notifications/unread-count` - get unread count only
  - `POST /notifications/{id}/read` - mark single as read
  - `POST /notifications/read-all` - mark all as read

**Definition of Done:**
- [x] Notification model and API
- [x] Triggers create notifications automatically
- [x] Integration tests (15 tests)
- [ ] Frontend notification UI (future work)

---

### Milestone 4.2: User Profiles ✅

**Branch:** `feature/17-profiles` (merged)
**Completed:** 2026-01-25

**Scope:**
- Public user profile page
- Display participation history and stats

**Key Deliverables:**
- `ProfileService` with participation aggregation and rank calculation
- API endpoints:
  - `GET /users/{username}` - public profile with participations
  - `GET /users/{username}/stats` - lightweight stats summary
- Profile data: display name, join date, competitions entered, best ranks
- Participation details: competition, enrollment date, submission count, best score, rank
- Frontend: `/users/{username}` profile page (future work)

**Definition of Done:**
- [x] Public profile API (respects privacy)
- [x] Profile aggregates user's competition participations
- [x] Ranks calculated correctly per competition
- [x] Integration tests (11 tests)
- [ ] Frontend profile page with real data (future work)
- [ ] Links from leaderboard/discussions to profiles (future work)

---

### Milestone 4.3: User Dashboard ✅

**Branch:** `feature/18-dashboard` (merged)
**Completed:** 2026-01-25

**Scope:**
- Personal home view for logged-in users
- Enrolled competitions, recent submissions, notifications

**Key Deliverables:**
- `DashboardService` with data aggregation across competitions, submissions, notifications
- API endpoints:
  - `GET /dashboard` - full dashboard with competitions, submissions, notifications, stats
  - `GET /dashboard/stats` - lightweight stats summary
- Dashboard data includes:
  - Active/enrolled competitions with progress (days remaining, rank, best score)
  - Recent submissions with scores
  - Recent notifications feed
  - Quick stats (total competitions, active, submissions, unread notifications)
- Frontend: Dashboard page (future work)

**Definition of Done:**
- [x] Dashboard API returns user's relevant data
- [x] Competitions prioritized by status (active first)
- [x] User stats aggregated across all competitions
- [x] Integration tests (11 tests)
- [ ] Frontend dashboard with real data (future work)
- [ ] Navigation updates to show dashboard as home (future work)

---

## Phase 5: Higher-Coupling Features

### Milestone 5.1: Teams ✅

**Branch:** `feature/19-teams` (merged)
**Completed:** 2026-01-25

**Scope:**
- Team formation for competitions
- Team ownership of submissions
- Team leaderboard representation

**Key Deliverables:**
- `Team` model with name, competition, members, leader
- `TeamMember` model with role (leader/member)
- `TeamInvitation` model for invitation flow
- `TeamService` with full team management:
  - Create team (user becomes leader)
  - Invite member (leader only)
  - Accept/decline invitation
  - Leave team (leader leaving promotes another member)
  - Remove member (leader only)
  - Transfer leadership
- API endpoints:
  - `GET /competitions/{slug}/teams` - list teams
  - `POST /competitions/{slug}/teams` - create team
  - `GET /competitions/{slug}/teams/{id}` - get team details
  - `GET /competitions/{slug}/my-team` - get user's team
  - `POST /teams/{id}/invite` - invite member
  - `GET /invitations` - list pending invitations
  - `POST /invitations/{id}/accept` - accept invitation
  - `POST /invitations/{id}/decline` - decline invitation
  - `POST /teams/{id}/leave` - leave team
  - `DELETE /teams/{id}/members/{user_id}` - remove member
  - `POST /teams/{id}/transfer-leadership` - transfer leadership
- Leaderboard updated to support team mode:
  - Solo competitions show user rankings
  - Team competitions show team rankings
- Team notification types added

**Definition of Done:**
- [x] Team CRUD API
- [x] Team invitation flow with notifications
- [x] Leaderboard supports team mode
- [x] Integration tests (15 tests)
- [ ] Frontend team management UI (future work)

**Dependencies:**
- Leaderboard (Milestone 1.2)
- Notifications (Milestone 4.1)

---

### Milestone 5.2: Admin Panel ✅

**Branch:** `feature/20-admin` (merged)
**Completed:** 2026-01-25

**Scope:**
- User management (view, suspend, reactivate, change role)
- Competition management (view all including private/draft)
- Discussion moderation (lock, unlock, pin, unpin)
- Platform-wide statistics

**Key Deliverables:**
- `AdminService` with full admin capabilities:
  - Platform statistics (users, competitions, submissions, enrollments)
  - User listing with search, filtering, pagination
  - User suspension/reactivation
  - User role management
  - Competition listing (including private/draft)
  - Thread moderation (lock/unlock, pin/unpin)
- `require_admin` dependency for role-based access control
- API endpoints:
  - `GET /admin/stats` - platform-wide statistics
  - `GET /admin/users` - list users with filtering
  - `GET /admin/users/{id}` - get user details
  - `POST /admin/users/{id}/suspend` - suspend user
  - `POST /admin/users/{id}/reactivate` - reactivate user
  - `PATCH /admin/users/{id}/role` - change user role
  - `GET /admin/competitions` - list all competitions
  - `POST /admin/threads/{id}/lock` - lock thread
  - `POST /admin/threads/{id}/unlock` - unlock thread
  - `POST /admin/threads/{id}/pin` - pin thread
  - `POST /admin/threads/{id}/unpin` - unpin thread
- Safety measures:
  - Cannot suspend yourself
  - Cannot suspend other admins
  - Cannot change your own role

**Definition of Done:**
- [x] Admin APIs protected by role
- [x] User management functional
- [x] Competition management functional
- [x] Thread moderation functional
- [x] Platform stats functional
- [x] Integration tests (22 tests)
- [ ] Frontend admin UI (future work)

**Dependencies:**
- Discussions (Milestone 1.1)

---

## Summary Table

| Milestone | Branch | Phase | Status | Dependencies |
|-----------|--------|-------|--------|--------------|
| Discussions | feature/12-discussions | 1 | ✅ Done | None |
| Leaderboard | feature/13-leaderboard | 1 | ✅ Done | None |
| Storage | feature/14-storage | 2 | ✅ Done | None |
| Async Scoring | feature/15-async-scoring | 3 | ✅ Done | Storage (soft) |
| Notifications | feature/16-notifications | 4 | ✅ Done | None |
| Profiles | feature/17-profiles | 4 | ✅ Done | None |
| Dashboard | feature/18-dashboard | 4 | ✅ Done | Notifications |
| Teams | feature/19-teams | 5 | ✅ Done | Leaderboard |
| Admin | feature/20-admin | 5 | ✅ Done | Discussions |

---

## Notes

- Milestones within the same phase can be parallelized if resources allow
- Each milestone should take 1-3 focused sessions
- Update this document as scope evolves
