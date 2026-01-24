# Daggle MVP Architecture Proposal

## Executive Summary

This document proposes an architecture for the Daggle internal competition platform that prioritizes long-term maintainability over speed of initial delivery. The approach favors explicit contracts, localized changes, and incremental evolution over clever abstractions or premature optimization.

The system is a straightforward three-tier application: Angular frontend, API backend, and relational database. We avoid distributed systems patterns for MVP, keeping the architecture simple enough that any engineer can understand the full system within a day.

---

## 1. Overall Architecture Shape

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                 Angular Application                        │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │  │
│  │  │  Discovery  │ │ Participant │ │       Admin         │  │  │
│  │  │   Module    │ │   Module    │ │      Module         │  │  │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘  │  │
│  │                         │                                  │  │
│  │              ┌──────────┴──────────┐                      │  │
│  │              │    Core Services    │                      │  │
│  │              │  (API, Auth, State) │                      │  │
│  │              └──────────┬──────────┘                      │  │
│  └─────────────────────────┼─────────────────────────────────┘  │
└────────────────────────────┼────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────┼────────────────────────────────────┐
│                     API Gateway / Ingress                        │
└────────────────────────────┼────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                      API Server                                  │
│  ┌─────────────────────────┴─────────────────────────────────┐  │
│  │                    GraphQL Layer                           │  │
│  │              (Query/Mutation Resolvers)                    │  │
│  └─────────────────────────┬─────────────────────────────────┘  │
│                             │                                    │
│  ┌──────────────────────────┴────────────────────────────────┐  │
│  │                   Domain Services                          │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐            │  │
│  │  │Competition │ │ Submission │ │    User    │            │  │
│  │  │  Service   │ │  Service   │ │  Service   │            │  │
│  │  └────────────┘ └────────────┘ └────────────┘            │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────┴───────────────────────────────┐  │
│  │                   Repository Layer                         │  │
│  │            (Database access abstraction)                   │  │
│  └───────────────────────────┬───────────────────────────────┘  │
└──────────────────────────────┼───────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────┐
│                        PostgreSQL                                 │
│                   (Single database instance)                      │
└──────────────────────────────────────────────────────────────────┘
```

### Why This Shape

**Single API server, not microservices**: For an internal tool with a small team, microservices add coordination overhead without benefit. A well-structured monolith is easier to debug, deploy, and reason about. We can extract services later if genuine scaling needs emerge.

**PostgreSQL over document stores**: Competition data has clear relationships (users enroll in competitions, submit to competitions, etc.). Relational integrity prevents entire categories of bugs. PostgreSQL's JSON columns provide document flexibility where needed without abandoning relational guarantees.

**GraphQL with escape hatches**: GraphQL's type system provides self-documenting APIs and lets the frontend request exactly what it needs. However, we'll use REST endpoints for specific cases where GraphQL adds friction (file uploads, health checks, simple webhooks).

---

## 2. Frontend Architecture

### Module Structure

```
src/
├── app/
│   ├── core/                    # Singleton services, guards, interceptors
│   │   ├── auth/
│   │   ├── api/
│   │   └── error-handling/
│   │
│   ├── shared/                  # Reusable components, pipes, directives
│   │   ├── components/
│   │   ├── pipes/
│   │   └── directives/
│   │
│   ├── features/                # Feature modules (lazy-loaded)
│   │   ├── competition/
│   │   │   ├── discovery/       # Discovery mode components
│   │   │   ├── participant/     # Participant mode components
│   │   │   ├── admin/           # Admin mode components
│   │   │   └── shared/          # Shared within competition feature
│   │   │
│   │   ├── home/
│   │   └── profile/
│   │
│   └── app.component.ts
```

### Key Principles

**Mode as Route + Permission, Not Global State**

The three modes (discovery, participant, admin) map to:
1. **Route structure**: `/competitions/:id` vs `/competitions/:id/manage`
2. **Permission checks**: Backend validates user role for each request
3. **Component selection**: Route determines which component tree renders

Avoid a global "mode" variable that components read. Instead, each route loads the appropriate module, and that module's components assume their context. This makes each mode independently testable and prevents cross-mode state bugs.

```typescript
// Routes make mode explicit
const routes: Routes = [
  {
    path: 'competitions/:id',
    component: CompetitionShellComponent,
    children: [
      { path: '', component: CompetitionOverviewComponent },  // Discovery/Participant
      { path: 'submit', component: SubmissionComponent, canActivate: [ParticipantGuard] },
    ]
  },
  {
    path: 'competitions/:id/manage',
    component: AdminShellComponent,
    canActivate: [SponsorGuard],
    children: [
      { path: '', component: AdminOverviewComponent },
      { path: 'config', component: AdminConfigComponent },
      // ...
    ]
  }
];
```

**State Management: Start Simple**

For MVP, use Angular services with BehaviorSubjects for local state. Avoid NgRx or similar until you have:
- Complex state shared across many unrelated components
- Time-travel debugging needs
- Undo/redo requirements

Most "state management problems" are actually component communication problems solvable with proper service design.

```typescript
// Simple service-based state
@Injectable({ providedIn: 'root' })
export class CompetitionStateService {
  private competitionSubject = new BehaviorSubject<Competition | null>(null);
  competition$ = this.competitionSubject.asObservable();

  loadCompetition(id: string): Observable<Competition> {
    return this.api.getCompetition(id).pipe(
      tap(comp => this.competitionSubject.next(comp))
    );
  }
}
```

**Angular Material Usage**

Use Angular Material as the primary component library. Resist the urge to heavily customize—accept Material's opinions for consistency. Custom styling should be limited to:
- Brand colors via theming
- Specific spacing/layout needs
- Components Material doesn't provide

### Frontend Testing Philosophy

**Unit test services and pipes, not components**

Component unit tests often test Angular itself rather than your logic. Focus component testing on:
- Complex conditional rendering
- Form validation logic
- Components with significant local state

**Prefer integration tests via Playwright**

The existing Playwright setup should be the primary way to verify UI behavior. Test user journeys, not implementation details:
- "User can enroll in a competition"
- "Admin can update competition settings"
- "Participant sees their rank update after submission"

**Visual regression for layout stability**

The tab width stability tests already in place are the right pattern. Extend this to catch:
- Mode switching doesn't cause layout jumps
- Responsive breakpoints work correctly
- Admin panels maintain consistent widths

---

## 3. Backend Architecture

### Service Organization

```
src/
├── graphql/
│   ├── schema/                  # GraphQL type definitions
│   ├── resolvers/               # Query and mutation handlers
│   └── directives/              # Auth, validation directives
│
├── domain/
│   ├── competition/
│   │   ├── competition.service.ts
│   │   ├── competition.repository.ts
│   │   └── competition.types.ts
│   │
│   ├── submission/
│   │   ├── submission.service.ts
│   │   ├── submission.repository.ts
│   │   ├── scoring.service.ts   # Scoring logic isolated
│   │   └── submission.types.ts
│   │
│   └── user/
│       ├── user.service.ts
│       ├── user.repository.ts
│       └── user.types.ts
│
├── infrastructure/
│   ├── database/                # Connection, migrations
│   ├── auth/                    # Authentication integration
│   ├── storage/                 # File storage abstraction
│   └── logging/                 # Structured logging setup
│
└── rest/                        # REST endpoints where needed
    ├── health.controller.ts
    └── upload.controller.ts
```

### Layer Responsibilities

**GraphQL Resolvers**: Request handling, authorization, input validation, response shaping. No business logic. A resolver should read like a routing table entry.

```typescript
// Resolver is thin—just wiring
@Resolver('Competition')
export class CompetitionResolver {
  @Query()
  @Authorized()
  async competition(@Arg('id') id: string, @Ctx() ctx: Context) {
    return this.competitionService.getById(id, ctx.user);
  }

  @Mutation()
  @Authorized('SPONSOR')
  async updateCompetition(@Arg('input') input: UpdateCompetitionInput, @Ctx() ctx: Context) {
    return this.competitionService.update(input, ctx.user);
  }
}
```

**Domain Services**: Business logic, workflow orchestration, authorization decisions. Services know about the domain but not about HTTP or GraphQL.

```typescript
// Service contains the actual logic
export class CompetitionService {
  async update(input: UpdateCompetitionInput, actor: User): Promise<Competition> {
    const competition = await this.repository.findById(input.id);

    if (!this.canUserManage(competition, actor)) {
      throw new ForbiddenError('Not authorized to manage this competition');
    }

    if (competition.isActive && input.changesRules) {
      await this.notifyParticipants(competition, 'rules_changed');
    }

    const updated = await this.repository.update(input);
    await this.auditLog.record('competition.updated', { actor, competition: updated, changes: input });

    return updated;
  }
}
```

**Repositories**: Data access only. No business logic. Repositories translate between domain objects and database rows.

### GraphQL Design Guidelines

**Prefer specific queries over generic filters**

```graphql
# Good: Intent is clear
type Query {
  myCompetitions: [Competition!]!
  activeCompetitions: [Competition!]!
  competitionsIMayManage: [Competition!]!
}

# Avoid: Generic filter that requires complex authorization logic
type Query {
  competitions(filter: CompetitionFilter): [Competition!]!
}
```

**Mutations should be task-oriented, not CRUD-oriented**

```graphql
# Good: Captures intent
type Mutation {
  enrollInCompetition(id: ID!): EnrollmentResult!
  submitPredictions(competitionId: ID!, file: Upload!): SubmissionResult!
  extendDeadline(competitionId: ID!, newDeadline: DateTime!): Competition!
}

# Avoid: Generic CRUD
type Mutation {
  createEnrollment(input: EnrollmentInput!): Enrollment!
  updateCompetition(id: ID!, input: CompetitionInput!): Competition!
}
```

**Use result types for operations with meaningful outcomes**

```graphql
type SubmissionResult {
  submission: Submission
  score: Float
  rank: Int
  validationErrors: [ValidationError!]
  rateLimitInfo: RateLimitInfo
}

type ValidationError {
  field: String
  message: String!
  code: String!
}
```

---

## 4. Database Philosophy

### Principles Over Schema

**Explicit relationships, not implicit conventions**

Foreign keys should be enforced at the database level. If a submission references a competition, that constraint lives in the schema, not just application code. This prevents orphaned data and makes relationships discoverable.

**Audit by default**

Every significant table should have `created_at`, `updated_at`, and `created_by` columns. For admin actions, maintain a separate audit log table that captures before/after state. This is cheap to implement and invaluable for debugging.

**Soft deletes for user-facing data**

Competitions, submissions, and enrollments should never be physically deleted. Use a `deleted_at` timestamp. This prevents accidental data loss and supports audit trails.

**JSON columns for extensible metadata, not core data**

PostgreSQL's JSONB is useful for:
- Competition-specific configuration (scoring parameters, display options)
- Submission metadata (file hashes, processing details)
- User preferences

It should not be used for:
- Core relationships (enrollment, scores)
- Data you need to query or aggregate
- Data with validation requirements

### Migration Philosophy

**Migrations are append-only in production**

Never edit a migration that has been applied to any shared environment. If you made a mistake, write a new migration to fix it. This prevents environment drift.

**Migrations should be reversible when possible**

Include `down` migrations. Even if you never run them, writing them forces you to think about the change's reversibility.

**Data migrations separate from schema migrations**

Schema changes (add column, create table) should not include data transformations. Run data migrations as separate, audited operations. This makes rollback cleaner and debugging easier.

---

## 5. Deployment Architecture

### Local Development

```yaml
# docker-compose.yml
services:
  frontend:
    build: ./frontend
    ports: ["4200:4200"]
    volumes:
      - ./frontend/src:/app/src  # Live reload
    environment:
      - API_URL=http://api:3000

  api:
    build: ./api
    ports: ["3000:3000"]
    volumes:
      - ./api/src:/app/src       # Live reload
    environment:
      - DATABASE_URL=postgres://postgres:postgres@db:5432/daggle
      - AUTH_MODE=development    # Skip real auth locally
    depends_on:
      - db

  db:
    image: postgres:15
    ports: ["5432:5432"]
    environment:
      - POSTGRES_DB=daggle
      - POSTGRES_PASSWORD=postgres
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### Production (Kubernetes/OpenShift)

The same containers run in production with different configuration:

```yaml
# Key differences from local:
# - No volume mounts (immutable containers)
# - External database (managed PostgreSQL)
# - Real authentication provider
# - Resource limits defined
# - Health checks configured
# - Secrets from external secret store
```

### Configuration Principles

**Twelve-factor configuration**

All environment-specific values come from environment variables. No config files that differ between environments. This includes:
- Database connection strings
- Authentication provider URLs
- Feature flags
- Log levels

**Identical images across environments**

The container image deployed to staging is the exact same image deployed to production. Only configuration differs.

**Health endpoints**

```
GET /health/live    # Process is running (for K8s liveness)
GET /health/ready   # Can serve requests (for K8s readiness)
```

Readiness should check database connectivity. Liveness should not—a database outage shouldn't trigger pod restarts.

---

## 6. Testing Strategy

### Testing Pyramid

```
        ╱╲
       ╱  ╲         E2E (Playwright)
      ╱    ╲        - User journeys
     ╱──────╲       - 10-20 critical paths
    ╱        ╲
   ╱          ╲     Integration
  ╱            ╲    - API + Database
 ╱              ╲   - Service interactions
╱────────────────╲  - 50-100 tests

╔══════════════════╗ Unit
║                  ║ - Domain logic
║                  ║ - Utilities
║                  ║ - 200+ tests
╚══════════════════╝
```

### What to Unit Test

**Do unit test:**
- Scoring algorithms
- Validation logic
- Date/time calculations
- Permission checks (given these inputs, can user X do action Y?)
- Data transformations

**Don't unit test:**
- Simple CRUD operations
- GraphQL resolver wiring
- Angular component templates
- Anything that requires mocking 5+ dependencies

### Integration Testing

Integration tests verify that components work together correctly. For the API:

```typescript
describe('Submission flow', () => {
  let testDb: TestDatabase;
  let testUser: User;
  let testCompetition: Competition;

  beforeEach(async () => {
    testDb = await TestDatabase.create();
    testUser = await testDb.createUser({ enrolled: true });
    testCompetition = await testDb.createCompetition({ active: true });
  });

  it('accepts valid submission and returns score', async () => {
    const result = await graphql(SUBMIT_MUTATION, {
      competitionId: testCompetition.id,
      file: validSubmissionFile
    }, { user: testUser });

    expect(result.submission.status).toBe('SCORED');
    expect(result.submission.score).toBeGreaterThan(0);
    expect(result.rank).toBeDefined();
  });

  it('rejects submission when daily limit exceeded', async () => {
    await testDb.createSubmissions(testUser, testCompetition, 5); // Hit limit

    const result = await graphql(SUBMIT_MUTATION, {
      competitionId: testCompetition.id,
      file: validSubmissionFile
    }, { user: testUser });

    expect(result.errors[0].code).toBe('RATE_LIMIT_EXCEEDED');
  });
});
```

### End-to-End Testing

Playwright tests verify complete user journeys through the real system:

```typescript
test.describe('Competition participation', () => {
  test('new user can discover, enroll, and submit', async ({ page }) => {
    // Discovery mode
    await page.goto('/competitions');
    await page.click('text=Customer Churn Prediction');
    await expect(page.locator('[data-testid="join-button"]')).toBeVisible();

    // Enroll
    await page.click('[data-testid="join-button"]');
    await expect(page.locator('[data-testid="enrolled-badge"]')).toBeVisible();

    // Submit
    await page.click('text=Submissions');
    await page.setInputFiles('[data-testid="upload-input"]', 'fixtures/valid-submission.csv');
    await expect(page.locator('[data-testid="submission-score"]')).toBeVisible();
  });
});
```

### Visual Regression Testing

Continue the pattern established with tab width stability tests:

```typescript
test('admin mode layout remains stable across tabs', async ({ page }) => {
  await page.goto('/competitions/test-comp/manage');

  const tabContainer = page.locator('.tab-container');
  const initialWidth = await tabContainer.boundingBox();

  for (const tab of ['config', 'data', 'monitoring', 'rules', 'discussions']) {
    await page.click(`[data-tab="${tab}"]`);
    const currentWidth = await tabContainer.boundingBox();
    expect(currentWidth.width).toBe(initialWidth.width);
  }
});
```

---

## 7. Iterative Development Path

### MVP Scope

The MVP should include:
- Competition CRUD (admin)
- Enrollment (participants)
- File upload submission
- Basic scoring (synchronous, simple metrics)
- Leaderboard display
- Three UI modes working end-to-end

### Evolution Path

**Phase 2: Richer Admin Controls**

The admin module structure already supports this. Add:
- Participant management (view, remove, contact)
- Submission review/invalidation
- Competition analytics dashboard

No architectural changes needed—just new components and API endpoints.

**Phase 3: SSO Authentication**

The auth infrastructure should be designed for this from the start:

```typescript
// auth/auth.service.ts
export interface AuthProvider {
  validateToken(token: string): Promise<User | null>;
  getLoginUrl(): string;
}

// MVP: Simple development auth
export class DevAuthProvider implements AuthProvider { ... }

// Later: OIDC/SAML provider
export class OidcAuthProvider implements AuthProvider { ... }
```

The rest of the application doesn't change—it just receives a `User` object from the auth layer.

**Phase 4: Background Processing**

When synchronous scoring becomes a bottleneck:

1. Extract scoring into a separate service (still in the same codebase)
2. Add a job queue (PostgreSQL-backed is fine for MVP scale)
3. Submission endpoint returns immediately with "processing" status
4. Frontend polls or uses WebSocket for completion

```typescript
// Before: Synchronous
async submitPredictions(file): Promise<SubmissionResult> {
  const submission = await this.createSubmission(file);
  const score = await this.scoringService.score(submission);
  return { submission, score };
}

// After: Async
async submitPredictions(file): Promise<SubmissionResult> {
  const submission = await this.createSubmission(file);
  await this.jobQueue.enqueue('score-submission', { submissionId: submission.id });
  return { submission, status: 'PROCESSING' };
}
```

**Phase 5: Observability**

Add incrementally without architectural changes:
- Structured logging (should be there from day one)
- Metrics endpoint for Prometheus
- Distributed tracing headers (prepare for this, implement when needed)

---

## 8. Robustness and Safety

### Admin Action Guardrails

**Confirmation for destructive actions**

Any action that affects participants (deadline changes, rule changes, data updates) should:
1. Show a preview of impact ("47 participants will be notified")
2. Require explicit confirmation
3. Log the action with full context

**Staged changes for sensitive updates**

For competition data updates:
1. Upload new data to staging location
2. Validate format and compatibility
3. Show diff/comparison to admin
4. Require confirmation to publish
5. Notify affected participants
6. Keep previous version accessible

### Partial Failure Handling

**Submissions**

```typescript
async processSubmission(file: File): Promise<SubmissionResult> {
  // Validation failures are expected—return structured errors
  const validation = await this.validateFormat(file);
  if (!validation.valid) {
    return {
      status: 'VALIDATION_FAILED',
      errors: validation.errors,
      submission: null
    };
  }

  // Scoring failures are unexpected—log and return graceful error
  try {
    const score = await this.score(file);
    return { status: 'SCORED', score, submission: ... };
  } catch (error) {
    this.logger.error('Scoring failed', { error, submissionId });
    return {
      status: 'SCORING_FAILED',
      message: 'Scoring temporarily unavailable. Your submission is saved and will be scored shortly.',
      submission: ...
    };
  }
}
```

**Database transactions**

Use transactions for multi-step operations:

```typescript
async enrollUser(userId: string, competitionId: string) {
  return this.db.transaction(async (tx) => {
    const enrollment = await tx.enrollments.create({ userId, competitionId });
    await tx.competitions.incrementParticipantCount(competitionId);
    await tx.auditLog.create({ action: 'user.enrolled', ... });
    return enrollment;
  });
}
```

### Logging and Auditability

**Structured logging from day one**

```typescript
this.logger.info('Submission processed', {
  submissionId: submission.id,
  userId: user.id,
  competitionId: competition.id,
  score: result.score,
  processingTimeMs: Date.now() - startTime
});
```

**Audit log for admin actions**

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID NOT NULL,
  changes JSONB,  -- Before/after for updates
  metadata JSONB  -- Additional context
);

CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);
```

### Avoiding Silent Failures

**No swallowed exceptions**

Every catch block must either:
1. Handle the error meaningfully, or
2. Log and rethrow, or
3. Return an explicit error result

```typescript
// Bad: Silent failure
try {
  await this.sendNotification(user);
} catch (e) {
  // Notification failed, oh well
}

// Good: Explicit handling
try {
  await this.sendNotification(user);
} catch (error) {
  this.logger.warn('Notification failed', { userId: user.id, error });
  await this.failedNotifications.queue({ userId: user.id, retryAt: ... });
}
```

**Health checks that actually check health**

```typescript
async checkReady(): Promise<HealthResult> {
  const checks = await Promise.all([
    this.checkDatabase(),
    this.checkStorage(),
  ]);

  const failed = checks.filter(c => !c.healthy);
  return {
    healthy: failed.length === 0,
    checks,
    // Include actual failure reasons, not just "unhealthy"
  };
}
```

---

## 9. Versioning and Change Management

### API Evolution

**GraphQL schema evolution**

- **Adding fields**: Always safe. Add with clear documentation.
- **Deprecating fields**: Mark with `@deprecated`, log usage, remove after migration period.
- **Removing fields**: Never without deprecation period. Monitor for usage first.
- **Changing field types**: Don't. Add a new field instead.

```graphql
type Competition {
  id: ID!
  title: String!
  deadline: DateTime! @deprecated(reason: "Use submissionDeadline instead")
  submissionDeadline: DateTime!
}
```

**Versioning strategy**

For MVP, avoid API versioning entirely. GraphQL's additive nature makes this possible. If breaking changes become necessary:

1. Prefer field-level deprecation over API versions
2. If versions are needed, use header-based versioning (`API-Version: 2024-01`)
3. Support at most two versions simultaneously

### Database Changes

**Backward-compatible migrations**

Migrations should allow the previous application version to continue working:

```sql
-- Good: Additive change
ALTER TABLE competitions ADD COLUMN description_html TEXT;
-- Old code ignores new column, new code uses it

-- Requires coordination: Rename
-- Step 1: Add new column
ALTER TABLE competitions ADD COLUMN summary TEXT;
-- Step 2: Deploy code that writes to both columns
-- Step 3: Migrate data
UPDATE competitions SET summary = description WHERE summary IS NULL;
-- Step 4: Deploy code that reads from new column
-- Step 5: Drop old column (later)
```

**Schema change checklist**

Before applying any migration:
1. Can the current application version run against the new schema?
2. Can the new application version run against the current schema?
3. Is the migration reversible?
4. What's the data migration plan?
5. What's the rollback plan?

### Frontend/Backend Compatibility

**Feature flags for gradual rollout**

```typescript
// Backend
const features = {
  newScoringAlgorithm: process.env.FEATURE_NEW_SCORING === 'true',
  asyncSubmissions: process.env.FEATURE_ASYNC_SUBMISSIONS === 'true',
};

// GraphQL response includes feature flags
type Query {
  features: Features!
}

// Frontend adapts based on features
if (features.asyncSubmissions) {
  this.pollForResults(submissionId);
} else {
  // Response already includes score
}
```

---

## 10. Summary of Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Modular monolith | Simplicity for small team, extract later if needed |
| Frontend | Angular + Material | Specified constraint; material provides consistency |
| State management | Services + BehaviorSubject | Simpler than NgRx for MVP scope |
| API style | GraphQL primary, REST for uploads | Type safety, self-documentation, frontend flexibility |
| Database | PostgreSQL | Relational integrity, JSON flexibility, proven reliability |
| Auth | Provider abstraction | Swap implementations without app changes |
| File storage | Abstraction layer | Local dev, S3/MinIO in production |
| Testing | Pyramid with E2E emphasis | Catch regressions where users experience them |
| Deployment | Containers via compose/K8s | Consistent local and production environments |

---

## 11. What This Proposal Does Not Cover

- Specific database schema design
- Exact GraphQL schema
- Scoring algorithm implementation
- File storage implementation details
- CI/CD pipeline specifics
- Monitoring and alerting setup

These are implementation details to be decided during development, guided by the principles in this document.

---

## 12. Next Steps

1. **Validate constraints**: Confirm Angular/GraphQL/PostgreSQL choices with stakeholders
2. **Set up project structure**: Create repositories with the proposed folder structure
3. **Implement vertical slice**: Build one complete flow (e.g., competition listing → detail → enroll) to validate architecture
4. **Establish testing patterns**: Create example tests at each level that serve as templates
5. **Document decisions**: Start an ADR (Architecture Decision Record) log for significant choices

The architecture should emerge from building real features, not from extensive upfront design. This document provides guardrails, not a blueprint.
