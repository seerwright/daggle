# Daggle Implementation Plan

This document contains concrete decisions and an actionable plan for building the Daggle competition platform. These are commitments, not options.

---

## 1. Final Stack Decisions

### Backend: Node.js + NestJS + TypeScript

**Choice**: NestJS framework on Node.js

**Why**:
- TypeScript across the entire stack (shared types, consistent tooling)
- NestJS module system mirrors Angular's—same mental model for both
- First-class GraphQL support via `@nestjs/graphql`
- Dependency injection makes testing straightforward
- Large ecosystem, well-documented, actively maintained

**Not chosen**:
- Go: Would require context-switching and duplicate type definitions
- Express alone: Too minimal; we'd rebuild what NestJS provides
- Python/Django: GraphQL support is weaker, loses TypeScript benefits

### Database: PostgreSQL

**Choice**: PostgreSQL 15+

**Why**:
- Data is inherently relational: users enroll in competitions, submit to competitions, competitions have leaderboards
- Foreign key constraints prevent orphaned data (a submission can't reference a deleted competition)
- JSONB columns provide document flexibility for metadata without sacrificing relational integrity
- Excellent tooling: pgAdmin, migrations, backups, replication
- Battle-tested, boring technology—exactly what we want

**How we'll use it**:
- Relational tables for core entities (users, competitions, enrollments, submissions)
- JSONB for: competition configuration, submission metadata, user preferences
- Full-text search via `tsvector` if needed (not for MVP)
- No ORM magic—we'll use a query builder (Knex) with explicit SQL for complex queries

**Not chosen**:
- MongoDB: Loses referential integrity; "flexible schema" becomes "inconsistent data"
- SQLite: Not suitable for concurrent access in containerized deployment

### API: GraphQL + REST Escape Hatches

**Choice**: GraphQL for data operations, REST for specific endpoints

**GraphQL handles**:
- All queries (competitions, submissions, users, leaderboards)
- All mutations (enroll, submit, update competition, etc.)
- Type-safe, self-documenting API
- Frontend requests exactly what it needs

**REST handles**:
- `POST /api/upload` — File uploads (multipart form data)
- `GET /api/health/live` — Kubernetes liveness probe
- `GET /api/health/ready` — Kubernetes readiness probe
- `GET /api/files/:id` — File downloads (if needed)

**Why the split**:
- GraphQL file uploads work but add complexity (apollo-upload-client, stream handling)
- Health endpoints are simpler as plain REST
- Keep GraphQL focused on what it does well

### ORM/Query: Knex + Custom Repository Pattern

**Choice**: Knex.js query builder (not a full ORM)

**Why**:
- Explicit SQL—we see exactly what queries run
- Migrations built-in
- TypeScript support
- No "magic" that hides N+1 queries or generates unexpected SQL

**Not chosen**:
- TypeORM/Prisma: Too much abstraction; debugging generated queries is frustrating
- Raw pg client: Too low-level; Knex provides just enough convenience

---

## 2. Repository + Module Structure

### Monorepo Layout

```
daggle/
├── frontend/                    # Angular application
├── backend/                     # NestJS application
├── shared/                      # Shared TypeScript types
├── docker-compose.yml           # Local development
├── docker-compose.prod.yml      # Production-like local testing
├── Dockerfile.frontend
├── Dockerfile.backend
└── docs/
    ├── architecture-proposal.md
    └── implementation-plan.md
```

### Frontend Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── core/                       # Singleton services (one instance app-wide)
│   │   │   ├── core.module.ts
│   │   │   ├── auth/
│   │   │   │   ├── auth.service.ts         # Login, logout, token management
│   │   │   │   ├── auth.guard.ts           # Route protection
│   │   │   │   └── auth.interceptor.ts     # Attach JWT to requests
│   │   │   ├── api/
│   │   │   │   ├── graphql.module.ts       # Apollo client setup
│   │   │   │   └── api.service.ts          # GraphQL operations wrapper
│   │   │   └── error/
│   │   │       └── error-handler.service.ts
│   │   │
│   │   ├── shared/                     # Reusable UI components
│   │   │   ├── shared.module.ts
│   │   │   ├── components/
│   │   │   │   ├── status-pill/
│   │   │   │   ├── metric-card/
│   │   │   │   ├── file-upload/
│   │   │   │   └── confirm-dialog/
│   │   │   └── pipes/
│   │   │       ├── time-ago.pipe.ts
│   │   │       └── score-format.pipe.ts
│   │   │
│   │   ├── features/                   # Feature modules (lazy-loaded)
│   │   │   ├── home/
│   │   │   │   ├── home.module.ts
│   │   │   │   └── home.component.ts
│   │   │   │
│   │   │   ├── competition/
│   │   │   │   ├── competition.module.ts
│   │   │   │   ├── competition-routing.module.ts
│   │   │   │   │
│   │   │   │   ├── pages/                  # Route-level components
│   │   │   │   │   ├── competition-list/
│   │   │   │   │   ├── competition-detail/     # Discovery + Participant
│   │   │   │   │   └── competition-manage/     # Admin mode
│   │   │   │   │
│   │   │   │   ├── components/             # Feature-specific components
│   │   │   │   │   ├── overview-tab/
│   │   │   │   │   ├── submissions-tab/
│   │   │   │   │   ├── leaderboard/
│   │   │   │   │   └── admin/
│   │   │   │   │       ├── admin-overview/
│   │   │   │   │       ├── admin-config/
│   │   │   │   │       ├── admin-data/
│   │   │   │   │       └── admin-monitoring/
│   │   │   │   │
│   │   │   │   └── services/
│   │   │   │       ├── competition.service.ts
│   │   │   │       └── submission.service.ts
│   │   │   │
│   │   │   └── profile/
│   │   │       └── ...
│   │   │
│   │   ├── app.component.ts
│   │   ├── app.module.ts
│   │   └── app-routing.module.ts
│   │
│   ├── environments/
│   ├── styles/                         # Global SCSS
│   └── assets/
│
├── angular.json
├── package.json
└── tsconfig.json
```

### Backend Structure

```
backend/
├── src/
│   ├── main.ts                         # Application entry point
│   ├── app.module.ts                   # Root module
│   │
│   ├── graphql/                        # GraphQL layer
│   │   ├── graphql.module.ts
│   │   ├── schema.gql                  # Schema-first definitions
│   │   ├── resolvers/
│   │   │   ├── competition.resolver.ts
│   │   │   ├── submission.resolver.ts
│   │   │   ├── user.resolver.ts
│   │   │   └── leaderboard.resolver.ts
│   │   └── scalars/                    # Custom scalars (DateTime, etc.)
│   │
│   ├── domain/                         # Business logic layer
│   │   ├── competition/
│   │   │   ├── competition.module.ts
│   │   │   ├── competition.service.ts
│   │   │   ├── competition.repository.ts
│   │   │   └── competition.types.ts
│   │   │
│   │   ├── submission/
│   │   │   ├── submission.module.ts
│   │   │   ├── submission.service.ts
│   │   │   ├── submission.repository.ts
│   │   │   ├── scoring.service.ts      # Scoring logic isolated
│   │   │   └── submission.types.ts
│   │   │
│   │   ├── enrollment/
│   │   │   ├── enrollment.module.ts
│   │   │   ├── enrollment.service.ts
│   │   │   └── enrollment.repository.ts
│   │   │
│   │   └── user/
│   │       ├── user.module.ts
│   │       ├── user.service.ts
│   │       ├── user.repository.ts
│   │       └── user.types.ts
│   │
│   ├── infrastructure/                 # Technical concerns
│   │   ├── database/
│   │   │   ├── database.module.ts
│   │   │   ├── knex.provider.ts
│   │   │   └── migrations/
│   │   │
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   └── auth.guard.ts
│   │   │
│   │   ├── storage/
│   │   │   ├── storage.module.ts
│   │   │   └── storage.service.ts      # File storage abstraction
│   │   │
│   │   └── logging/
│   │       ├── logging.module.ts
│   │       └── logging.interceptor.ts
│   │
│   ├── rest/                           # REST endpoints
│   │   ├── health.controller.ts
│   │   └── upload.controller.ts
│   │
│   └── common/                         # Shared utilities
│       ├── decorators/
│       │   └── current-user.decorator.ts
│       ├── guards/
│       │   └── roles.guard.ts
│       └── filters/
│           └── http-exception.filter.ts
│
├── test/
│   ├── integration/                    # API + DB tests
│   └── utils/
│       └── test-database.ts
│
├── knexfile.ts                         # Knex configuration
├── nest-cli.json
├── package.json
└── tsconfig.json
```

### Shared Types

```
shared/
├── types/
│   ├── competition.ts                  # Competition interfaces
│   ├── submission.ts                   # Submission interfaces
│   ├── user.ts                         # User interfaces
│   └── api-responses.ts                # Standardized response shapes
├── constants/
│   └── permissions.ts                  # Permission constants
└── package.json
```

### Boundary Rules

| Layer | Can Import From | Cannot Import From |
|-------|-----------------|-------------------|
| GraphQL Resolvers | Domain Services, Common | Infrastructure, REST |
| Domain Services | Repositories, Types | GraphQL, REST, Infrastructure internals |
| Repositories | Database module, Types | Services, GraphQL |
| Infrastructure | Nothing domain-specific | Domain, GraphQL |
| REST Controllers | Domain Services | GraphQL |

---

## 3. Mode + Permissions Design

### Permission Model

```typescript
// shared/constants/permissions.ts

export enum Role {
  USER = 'USER',           // Authenticated but not enrolled
  PARTICIPANT = 'PARTICIPANT', // Enrolled in a competition
  SPONSOR = 'SPONSOR',     // Created/owns a competition
  ADMIN = 'ADMIN',         // Platform admin (future)
}

// Context-specific: role relative to a competition
export interface CompetitionContext {
  competitionId: string;
  role: Role;
  enrolledAt?: Date;
}
```

### How Modes Map to Routes and Permissions

```
Route                           Mode          Required Permission
─────────────────────────────────────────────────────────────────
/competitions                   (list)        USER (authenticated)
/competitions/:id               Discovery     USER
/competitions/:id               Participant   PARTICIPANT (enrolled)
/competitions/:id/submit        Participant   PARTICIPANT
/competitions/:id/manage        Admin         SPONSOR
/competitions/:id/manage/*      Admin         SPONSOR
/competitions/new               Create        USER (becomes SPONSOR)
```

### Frontend: Route Guards Determine Mode

```typescript
// competition-routing.module.ts

const routes: Routes = [
  {
    path: ':id',
    component: CompetitionDetailComponent,
    // No guard—anyone authenticated can view
    // Component checks enrollment status to show participant features
  },
  {
    path: ':id/submit',
    component: SubmissionComponent,
    canActivate: [ParticipantGuard],  // Must be enrolled
  },
  {
    path: ':id/manage',
    component: CompetitionManageComponent,
    canActivate: [SponsorGuard],      // Must be sponsor
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: AdminOverviewComponent },
      { path: 'config', component: AdminConfigComponent },
      { path: 'data', component: AdminDataComponent },
      { path: 'monitoring', component: AdminMonitoringComponent },
      { path: 'rules', component: AdminRulesComponent },
      { path: 'discussions', component: AdminDiscussionsComponent },
    ]
  },
];
```

### Frontend: Component Adapts Based on User Context

```typescript
// competition-detail.component.ts

@Component({ ... })
export class CompetitionDetailComponent implements OnInit {
  competition$: Observable<Competition>;
  userContext$: Observable<CompetitionContext>;

  // Template uses these to show/hide sections
  isEnrolled$: Observable<boolean>;
  canManage$: Observable<boolean>;

  constructor(
    private route: ActivatedRoute,
    private competitionService: CompetitionService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const competitionId = this.route.snapshot.params['id'];

    this.competition$ = this.competitionService.getCompetition(competitionId);

    this.userContext$ = this.competitionService.getUserContext(competitionId);

    this.isEnrolled$ = this.userContext$.pipe(
      map(ctx => ctx.role === Role.PARTICIPANT || ctx.role === Role.SPONSOR)
    );

    this.canManage$ = this.userContext$.pipe(
      map(ctx => ctx.role === Role.SPONSOR)
    );
  }
}
```

```html
<!-- competition-detail.component.html -->

<!-- Enrollment CTA (discovery mode) -->
<button *ngIf="!(isEnrolled$ | async)" (click)="enroll()">
  Join Competition
</button>

<!-- Participant features -->
<ng-container *ngIf="isEnrolled$ | async">
  <app-participant-status [competition]="competition$ | async"></app-participant-status>
  <button routerLink="submit">Make a Submission</button>
</ng-container>

<!-- Admin link (sponsors only) -->
<a *ngIf="canManage$ | async" routerLink="manage">
  Manage Competition
</a>
```

### Backend: Authorization at Resolver Level

```typescript
// competition.resolver.ts

@Resolver('Competition')
export class CompetitionResolver {
  constructor(private competitionService: CompetitionService) {}

  @Query()
  @UseGuards(JwtAuthGuard)  // Must be authenticated
  async competition(
    @Args('id') id: string,
    @CurrentUser() user: User
  ): Promise<Competition> {
    return this.competitionService.getById(id);
  }

  @Mutation()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRole(Role.SPONSOR, { contextParam: 'competitionId' })
  async updateCompetition(
    @Args('competitionId') competitionId: string,
    @Args('input') input: UpdateCompetitionInput,
    @CurrentUser() user: User
  ): Promise<Competition> {
    return this.competitionService.update(competitionId, input, user);
  }
}
```

### Backend: RolesGuard Checks Context-Specific Permissions

```typescript
// roles.guard.ts

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private enrollmentService: EnrollmentService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRole = this.reflector.get<Role>('role', context.getHandler());
    if (!requiredRole) return true;

    const ctx = GqlExecutionContext.create(context);
    const user = ctx.getContext().user;
    const args = ctx.getArgs();

    const competitionId = args.competitionId || args.id;

    // Check user's role for this specific competition
    const userRole = await this.enrollmentService.getUserRole(user.id, competitionId);

    return this.hasRequiredRole(userRole, requiredRole);
  }

  private hasRequiredRole(userRole: Role, required: Role): boolean {
    const hierarchy = [Role.USER, Role.PARTICIPANT, Role.SPONSOR, Role.ADMIN];
    return hierarchy.indexOf(userRole) >= hierarchy.indexOf(required);
  }
}
```

### Avoiding If-Statement Spaghetti

**Principle 1: Route determines mode, not runtime checks**

Don't: Check mode in every component
```typescript
// Bad
if (this.mode === 'admin') {
  this.showAdminPanel = true;
}
```

Do: Use separate routes/components
```typescript
// Good - route determines what component loads
{ path: 'manage', component: AdminShellComponent }
```

**Principle 2: Permissions checked once at the boundary**

Don't: Check permissions deep in component trees
```typescript
// Bad - checking throughout the tree
if (this.authService.canManage(this.competition)) { ... }
```

Do: Guard at route level, assume permission in component
```typescript
// Good - AdminConfigComponent only loads if user is SPONSOR
// No permission checks inside AdminConfigComponent
```

**Principle 3: Backend is the authority**

The frontend hides/shows UI for UX, but the backend enforces permissions. A user who manipulates the frontend cannot bypass authorization.

---

## 4. Testing Strategy

### Test Distribution

```
┌─────────────────────────────────────────────────────────────────┐
│                        Playwright E2E                           │
│    User journeys through the real system (10-15 tests)         │
├─────────────────────────────────────────────────────────────────┤
│                     Integration Tests                           │
│   API + Database together (50-80 tests)                        │
│   - GraphQL operations with real DB                            │
│   - File upload/download                                       │
│   - Permission enforcement                                      │
├─────────────────────────────────────────────────────────────────┤
│                       Unit Tests                                │
│   Pure logic in isolation (100+ tests)                         │
│   - Scoring algorithms                                         │
│   - Validation rules                                           │
│   - Permission calculations                                    │
│   - Date/rank calculations                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Playwright E2E Tests

**What they cover**: Complete user journeys through the running system

```typescript
// e2e/journeys/competition-participation.spec.ts

test.describe('Competition Participation', () => {
  test('user discovers, enrolls, and submits', async ({ page }) => {
    await loginAs(page, 'participant@example.com');

    // Discovery
    await page.goto('/competitions');
    await page.click('text=Customer Churn Prediction');
    await expect(page.locator('[data-testid="competition-title"]'))
      .toHaveText('Customer Churn Prediction');

    // Enrollment
    await page.click('[data-testid="enroll-button"]');
    await expect(page.locator('[data-testid="enrolled-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="participant-status"]')).toBeVisible();

    // Submission
    await page.click('[data-testid="submit-button"]');
    await page.setInputFiles('[data-testid="file-input"]', 'fixtures/valid-submission.csv');
    await page.click('[data-testid="confirm-submit"]');

    await expect(page.locator('[data-testid="submission-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="submission-rank"]')).toBeVisible();
  });

  test('sponsor creates and manages competition', async ({ page }) => {
    await loginAs(page, 'sponsor@example.com');

    // Create
    await page.goto('/competitions/new');
    await page.fill('[data-testid="title-input"]', 'Test Competition');
    await page.fill('[data-testid="description-input"]', 'Description');
    await page.click('[data-testid="create-button"]');

    await expect(page).toHaveURL(/\/competitions\/[\w-]+\/manage/);

    // Manage
    await page.click('[data-testid="tab-config"]');
    await page.fill('[data-testid="title-input"]', 'Updated Title');
    await page.click('[data-testid="save-button"]');

    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
  });
});
```

**Visual regression tests** (existing pattern):

```typescript
// e2e/visual/layout-stability.spec.ts

test.describe('Layout Stability', () => {
  test('tab container width stable across all tabs', async ({ page }) => {
    await page.goto('/competitions/test-competition');
    const container = page.locator('.tab-container');
    const initialBox = await container.boundingBox();

    const tabs = ['overview', 'task-data', 'evaluation', 'rules-timeline'];
    for (const tab of tabs) {
      await page.click(`[data-tab="${tab}"]`);
      const currentBox = await container.boundingBox();
      expect(currentBox.width).toBe(initialBox.width);
    }
  });

  test('mode switching preserves layout', async ({ page }) => {
    // Test from prototype already exists
  });
});
```

### Integration Tests

**What they cover**: API operations with real database

```typescript
// test/integration/submission.integration.spec.ts

describe('Submission API', () => {
  let app: INestApplication;
  let db: TestDatabase;

  beforeAll(async () => {
    app = await createTestApp();
    db = await TestDatabase.create();
  });

  beforeEach(async () => {
    await db.clean();
  });

  describe('submitPredictions mutation', () => {
    it('accepts valid submission and returns score', async () => {
      const user = await db.createUser();
      const competition = await db.createCompetition({ status: 'ACTIVE' });
      await db.enrollUser(user, competition);

      const result = await graphqlRequest(app, {
        query: SUBMIT_MUTATION,
        variables: {
          competitionId: competition.id,
          file: createTestFile('valid-predictions.csv'),
        },
        user,
      });

      expect(result.data.submitPredictions.status).toBe('SCORED');
      expect(result.data.submitPredictions.score).toBeGreaterThan(0);
      expect(result.data.submitPredictions.rank).toBeDefined();
    });

    it('rejects submission from non-enrolled user', async () => {
      const user = await db.createUser();
      const competition = await db.createCompetition({ status: 'ACTIVE' });
      // User is NOT enrolled

      const result = await graphqlRequest(app, {
        query: SUBMIT_MUTATION,
        variables: {
          competitionId: competition.id,
          file: createTestFile('valid-predictions.csv'),
        },
        user,
      });

      expect(result.errors[0].extensions.code).toBe('FORBIDDEN');
    });

    it('rejects submission when daily limit exceeded', async () => {
      const user = await db.createUser();
      const competition = await db.createCompetition({
        status: 'ACTIVE',
        dailySubmissionLimit: 5,
      });
      await db.enrollUser(user, competition);
      await db.createSubmissions(user, competition, 5); // At limit

      const result = await graphqlRequest(app, {
        query: SUBMIT_MUTATION,
        variables: {
          competitionId: competition.id,
          file: createTestFile('valid-predictions.csv'),
        },
        user,
      });

      expect(result.errors[0].extensions.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });
});
```

### Unit Tests

**What they cover**: Pure logic that doesn't need database or HTTP

```typescript
// domain/submission/scoring.service.spec.ts

describe('ScoringService', () => {
  describe('calculateAucRoc', () => {
    it('returns 1.0 for perfect predictions', () => {
      const predictions = [
        { id: '1', probability: 0.9 },
        { id: '2', probability: 0.1 },
      ];
      const actuals = [
        { id: '1', churned: true },
        { id: '2', churned: false },
      ];

      const score = ScoringService.calculateAucRoc(predictions, actuals);
      expect(score).toBe(1.0);
    });

    it('returns 0.5 for random predictions', () => {
      // ...
    });

    it('handles edge cases (all positive, all negative)', () => {
      // ...
    });
  });
});

// domain/submission/validation.service.spec.ts

describe('SubmissionValidation', () => {
  describe('validateFormat', () => {
    it('accepts valid CSV with required columns', () => {
      const csv = 'customer_id,churn_probability\n1,0.5\n2,0.3';
      const result = ValidationService.validateFormat(csv);
      expect(result.valid).toBe(true);
    });

    it('rejects CSV missing required columns', () => {
      const csv = 'id,probability\n1,0.5';
      const result = ValidationService.validateFormat(csv);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        code: 'MISSING_COLUMN',
        column: 'customer_id',
      });
    });

    it('rejects probabilities outside 0-1 range', () => {
      const csv = 'customer_id,churn_probability\n1,1.5';
      const result = ValidationService.validateFormat(csv);
      expect(result.valid).toBe(false);
    });
  });
});
```

### Must-Have Regression Tests for MVP

```
E2E (Playwright)
├── User can view competition list
├── User can view competition details (discovery mode)
├── User can enroll in competition
├── Enrolled user can submit predictions
├── Enrolled user sees their rank update
├── Sponsor can create competition
├── Sponsor can access admin panel
├── Sponsor can update competition settings
├── Layout remains stable during tab switching
└── Layout remains stable during mode transitions

Integration
├── Authentication flow (login, token refresh)
├── Competition CRUD operations
├── Enrollment creates correct records
├── Submission processing and scoring
├── Leaderboard calculation
├── Permission enforcement (enrolled, sponsor)
├── Daily submission limit enforcement
└── File upload handling

Unit
├── Scoring algorithm correctness
├── Submission validation rules
├── Rank calculation
├── Permission hierarchy logic
└── Date/time calculations (deadline, etc.)
```

---

## 5. Iteration Plan (Milestones)

### Milestone 1: Foundation
**Goal**: Running development environment with authentication stub

**Deliverables**:
- [ ] Monorepo structure created
- [ ] Angular app scaffolded with Material
- [ ] NestJS app scaffolded with GraphQL
- [ ] PostgreSQL in Docker Compose
- [ ] Basic auth (hardcoded users for dev, JWT tokens)
- [ ] Health endpoints working
- [ ] One GraphQL query working end-to-end (`me` query returns current user)

**Definition of Done**:
- `docker-compose up` starts all services
- Frontend can authenticate and display logged-in user
- GraphQL playground accessible at `/graphql`
- Health check returns 200

### Milestone 2: Competition Display
**Goal**: Discovery mode fully functional

**Deliverables**:
- [ ] Competition database schema + migrations
- [ ] Competition list page (Angular)
- [ ] Competition detail page (discovery mode)
- [ ] All tabs from prototype working (Overview, Task & Data, Evaluation, Getting Started, Rules)
- [ ] GraphQL queries: `competitions`, `competition(id)`
- [ ] Seeded test data

**Definition of Done**:
- User can browse competition list
- User can view all competition details
- Tab navigation works without layout jumping
- E2E test: user views competition details

### Milestone 3: Enrollment + Participant Mode
**Goal**: Users can enroll and see participant-specific UI

**Deliverables**:
- [ ] Enrollment database schema
- [ ] Enroll mutation
- [ ] Participant status display (rank, best score, submissions remaining)
- [ ] Submissions tab (UI only—no actual submission yet)
- [ ] Mini leaderboard in sidebar
- [ ] Route guards for participant features

**Definition of Done**:
- User can enroll in competition
- Enrolled user sees participant UI (status bar, submissions tab)
- Leaderboard shows enrolled users
- E2E test: user enrolls and sees participant mode

### Milestone 4: Submissions + Scoring
**Goal**: Core functionality—users can submit and get scored

**Deliverables**:
- [ ] Submission database schema
- [ ] File upload endpoint (REST)
- [ ] Submission processing (validation, scoring)
- [ ] Score storage and rank calculation
- [ ] Submission history display
- [ ] Daily limit enforcement

**Definition of Done**:
- User can upload CSV submission
- Submission is validated and scored
- Score appears in submission history
- Rank updates on leaderboard
- Daily limit prevents excess submissions
- E2E test: complete submission flow

### Milestone 5: Admin Mode
**Goal**: Sponsors can create and manage competitions

**Deliverables**:
- [ ] Competition create mutation
- [ ] Competition update mutation
- [ ] Admin route (`/competitions/:id/manage`)
- [ ] Admin tabs: Overview, Configuration, Data, Monitoring, Rules, Discussions
- [ ] Sponsor permission enforcement
- [ ] Audit logging for admin actions

**Definition of Done**:
- User can create new competition (becomes sponsor)
- Sponsor can access admin panel
- Sponsor can update competition settings
- Non-sponsors cannot access admin routes
- Admin actions are logged
- E2E test: sponsor creates and configures competition

### Milestone 6: Polish + Deploy Prep
**Goal**: Production-ready MVP

**Deliverables**:
- [ ] Error handling polished (user-friendly messages)
- [ ] Loading states throughout UI
- [ ] Form validation with clear feedback
- [ ] Full E2E test suite passing
- [ ] Production Docker builds
- [ ] Environment configuration documented
- [ ] OpenShift deployment manifests
- [ ] README with setup instructions

**Definition of Done**:
- All E2E tests pass
- No console errors in normal flows
- Application builds for production
- Can deploy to OpenShift-like environment
- Another developer can set up locally from README

---

## 6. Robustness Baseline

### Logging Approach

**Structured JSON logs**:

```typescript
// infrastructure/logging/logging.interceptor.ts

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.headers['x-request-id'] || uuidv4();
    const startTime = Date.now();

    // Attach requestId to request for use in services
    request.requestId = requestId;

    return next.handle().pipe(
      tap(() => {
        this.logger.log({
          requestId,
          method: request.method,
          path: request.path,
          userId: request.user?.id,
          duration: Date.now() - startTime,
          status: 'success',
        });
      }),
      catchError((error) => {
        this.logger.error({
          requestId,
          method: request.method,
          path: request.path,
          userId: request.user?.id,
          duration: Date.now() - startTime,
          status: 'error',
          error: error.message,
          stack: error.stack,
        });
        throw error;
      }),
    );
  }
}
```

**Log levels**:
- `error`: Unexpected failures (uncaught exceptions, database errors)
- `warn`: Expected failures (validation errors, permission denied)
- `info`: Significant operations (user enrolled, submission scored)
- `debug`: Detailed flow (disabled in production)

### Error Handling

**Backend: Consistent error response format**:

```typescript
// GraphQL error format
{
  "errors": [{
    "message": "You have exceeded your daily submission limit",
    "extensions": {
      "code": "RATE_LIMIT_EXCEEDED",
      "requestId": "abc-123",
      "details": {
        "limit": 5,
        "used": 5,
        "resetsAt": "2025-01-25T00:00:00Z"
      }
    }
  }]
}
```

**Frontend: Global error handler**:

```typescript
// core/error/error-handler.service.ts

@Injectable()
export class ErrorHandlerService implements ErrorHandler {
  constructor(private snackBar: MatSnackBar) {}

  handleError(error: any): void {
    console.error('Unhandled error:', error);

    // Extract user-friendly message
    const message = this.extractMessage(error);

    this.snackBar.open(message, 'Dismiss', {
      duration: 5000,
      panelClass: 'error-snackbar',
    });

    // In production, send to error tracking service
  }

  private extractMessage(error: any): string {
    if (error.graphQLErrors?.length > 0) {
      return error.graphQLErrors[0].message;
    }
    if (error.message) {
      return error.message;
    }
    return 'An unexpected error occurred';
  }
}
```

### Audit Logging

**What gets recorded**:

| Action | Recorded Fields |
|--------|-----------------|
| Competition created | actor, competition_id, initial_config |
| Competition updated | actor, competition_id, changed_fields, before, after |
| Deadline extended | actor, competition_id, old_deadline, new_deadline |
| Data uploaded | actor, competition_id, file_info, version |
| Participant removed | actor, competition_id, removed_user_id, reason |
| Submission invalidated | actor, submission_id, reason |

**Audit table schema**:

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(30) NOT NULL,
  resource_id UUID NOT NULL,
  changes JSONB,
  request_id VARCHAR(50),
  ip_address INET
);

CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);
```

### Security Baseline

**Password hashing**: bcrypt with cost factor 12

```typescript
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

**JWT tokens**:
- Access token: 15 minutes expiry
- Refresh token: 7 days expiry, stored in httpOnly cookie
- Tokens include: userId, email, issuedAt
- Tokens do NOT include: permissions (fetch fresh on each request)

**Input validation**:
- All GraphQL inputs validated via class-validator decorators
- File uploads validated: type, size, content

**CORS**:
- Explicit origin whitelist (no wildcard in production)

### Container Constraints (OpenShift-friendly)

**Non-root user**:

```dockerfile
# Dockerfile.backend
FROM node:18-alpine

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app
COPY --chown=appuser:appgroup . .

USER appuser

EXPOSE 3000
CMD ["node", "dist/main.js"]
```

**Environment variables for all config**:

```typescript
// Required environment variables
const config = {
  port: parseInt(process.env.PORT || '3000'),
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  },
  // No file paths, no hardcoded URLs
};
```

**Health endpoints**:

```typescript
// rest/health.controller.ts

@Controller('api/health')
export class HealthController {
  constructor(private db: DatabaseService) {}

  @Get('live')
  liveness() {
    // Process is running
    return { status: 'ok' };
  }

  @Get('ready')
  async readiness() {
    // Can serve requests
    try {
      await this.db.query('SELECT 1');
      return { status: 'ok', database: 'connected' };
    } catch (error) {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'disconnected',
      });
    }
  }
}
```

**Resource limits** (for Kubernetes manifest):

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

---

## 7. Summary Checklist

### Decisions Made

- [x] Backend: NestJS + TypeScript
- [x] Database: PostgreSQL with Knex query builder
- [x] API: GraphQL primary, REST for uploads/health
- [x] Auth: JWT with bcrypt password hashing
- [x] Container: Non-root, env-based config, health endpoints

### Implementation Order

1. [ ] **Milestone 1**: Foundation (auth, GraphQL working)
2. [ ] **Milestone 2**: Competition display (discovery mode)
3. [ ] **Milestone 3**: Enrollment + participant mode
4. [ ] **Milestone 4**: Submissions + scoring
5. [ ] **Milestone 5**: Admin mode
6. [ ] **Milestone 6**: Polish + deployment prep

### Test Coverage Requirements

- [ ] E2E: 10-15 user journey tests
- [ ] Integration: 50+ API+DB tests
- [ ] Unit: 100+ logic tests
- [ ] Visual: Layout stability tests

### Robustness Requirements

- [ ] Structured JSON logging with request IDs
- [ ] Consistent error response format
- [ ] Audit log for admin actions
- [ ] Health endpoints for Kubernetes
- [ ] Non-root container execution
