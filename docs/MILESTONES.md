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

## Phase 2: Platform Primitive

### Milestone 2.1: File Storage Abstraction

**Branch:** `feature/14-storage`

**Scope:**
- Abstract storage interface for files
- Local filesystem implementation (existing behavior)
- S3/MinIO implementation
- Wire submissions and datasets through abstraction

**Key Deliverables:**
- `StorageBackend` protocol/interface
- `LocalStorageBackend` implementation
- `S3StorageBackend` implementation
- Configuration via environment variables
- MinIO service in docker-compose for local dev
- Migrate submission uploads to use abstraction

**Definition of Done:**
- [ ] Storage interface defined
- [ ] Local backend works (existing behavior preserved)
- [ ] S3 backend works with MinIO in docker-compose
- [ ] Submissions use storage abstraction
- [ ] Integration test with local backend
- [ ] Documentation on configuring S3

**Dependencies:**
- None (can proceed independently)

**Risks:**
- Must preserve existing local file paths during migration

---

## Phase 3: Async Processing

### Milestone 3.1: Background Jobs for Scoring

**Branch:** `feature/15-async-scoring`

**Scope:**
- Async job execution with Celery + Redis
- Submission lifecycle: pending → scoring → scored/failed
- Idempotent scoring jobs
- Synchronous fallback for simple deployments

**Key Deliverables:**
- Celery worker configuration
- Redis service in docker-compose
- `score_submission` task
- Submission status field: `pending`, `scoring`, `scored`, `failed`
- API returns submission status; frontend polls or shows status
- Error capture and retry logic

**Definition of Done:**
- [ ] Celery worker runs in docker-compose
- [ ] Submissions queued and processed asynchronously
- [ ] Status updates reflected in API
- [ ] Failed jobs have error messages
- [ ] Synchronous scoring still works when Celery disabled
- [ ] Integration test for async flow

**Dependencies:**
- Storage abstraction (Milestone 2.1) helpful but not blocking

**Risks:**
- Increased infrastructure complexity
- Must handle worker failures gracefully

---

## Phase 4: User Awareness & Personalization

### Milestone 4.1: Notifications

**Branch:** `feature/16-notifications`

**Scope:**
- In-app notifications (no email)
- Triggers: submission scored, competition updates, discussion replies
- Simple notification model

**Key Deliverables:**
- `Notification` model: user, type, message, read status, link, created_at
- Notification triggers in submission and discussion services
- API endpoints:
  - `GET /notifications` - list user's notifications
  - `POST /notifications/{id}/read` - mark as read
  - `POST /notifications/read-all` - mark all as read
- Frontend: notification bell in header, dropdown list

**Definition of Done:**
- [ ] Notification model and API
- [ ] Triggers create notifications automatically
- [ ] Frontend shows unread count and list
- [ ] Integration tests for notification creation

---

### Milestone 4.2: User Profiles

**Branch:** `feature/17-profiles`

**Scope:**
- Public user profile page
- Display participation history and stats

**Key Deliverables:**
- API endpoint: `GET /users/{username}` - public profile data
- Profile data: display name, join date, competitions entered, best ranks
- Frontend: `/users/{username}` profile page
- Competition participation list with scores

**Definition of Done:**
- [ ] Public profile API (respects privacy)
- [ ] Frontend profile page with real data
- [ ] Links from leaderboard/discussions to profiles

---

### Milestone 4.3: User Dashboard

**Branch:** `feature/18-dashboard`

**Scope:**
- Personal home view for logged-in users
- Enrolled competitions, recent submissions, notifications

**Key Deliverables:**
- API endpoint: `GET /dashboard` - aggregated user data
- Frontend: Dashboard page (home when logged in)
- Sections: active competitions, recent submissions, notifications feed

**Definition of Done:**
- [ ] Dashboard API returns user's relevant data
- [ ] Frontend dashboard with real data
- [ ] Navigation updates to show dashboard as home

---

## Phase 5: Higher-Coupling Features

### Milestone 5.1: Teams

**Branch:** `feature/19-teams`

**Scope:**
- Team formation for competitions
- Team ownership of submissions
- Team leaderboard representation

**Key Deliverables:**
- `Team` model: name, competition, members, captain
- `TeamMembership` model
- Team invitation/join flow
- Submissions attributed to team
- Leaderboard shows teams instead of users (when applicable)

**Definition of Done:**
- [ ] Team CRUD API
- [ ] Team-based submissions
- [ ] Leaderboard supports team mode
- [ ] Frontend team management UI

**Dependencies:**
- Leaderboard (Milestone 1.2)
- Notifications helpful for invites

---

### Milestone 5.2: Admin Panel

**Branch:** `feature/20-admin`

**Scope:**
- User management (view, suspend)
- Competition management (view all, edit any)
- Discussion moderation (lock, pin, delete)
- Basic platform stats

**Key Deliverables:**
- Admin-only API endpoints
- Frontend admin section (role-gated)
- User list with search/filter
- Competition list with edit access
- Discussion moderation tools

**Definition of Done:**
- [ ] Admin APIs protected by role
- [ ] Frontend admin UI functional
- [ ] Moderation actions work

**Dependencies:**
- Discussions (Milestone 1.1)

---

## Summary Table

| Milestone | Branch | Phase | Dependencies |
|-----------|--------|-------|--------------|
| Discussions | feature/12-discussions | 1 | None |
| Leaderboard | feature/13-leaderboard | 1 | None |
| Storage | feature/14-storage | 2 | None |
| Async Scoring | feature/15-async-scoring | 3 | Storage (soft) |
| Notifications | feature/16-notifications | 4 | None |
| Profiles | feature/17-profiles | 4 | None |
| Dashboard | feature/18-dashboard | 4 | Notifications |
| Teams | feature/19-teams | 5 | Leaderboard |
| Admin | feature/20-admin | 5 | Discussions |

---

## Notes

- Milestones within the same phase can be parallelized if resources allow
- Each milestone should take 1-3 focused sessions
- Update this document as scope evolves
