# Daggle – Implementation Plan (Python Backend Variant)

This document presents an alternative implementation plan using Python for the backend. It preserves all product goals, UI design, and engineering principles from the original plan while adapting to Python's ecosystem and idioms.

---

## What Changed vs the Original Plan

| Aspect | Original (NestJS) | Python Variant | Impact |
|--------|-------------------|----------------|--------|
| Backend Framework | NestJS | FastAPI | Similar module structure; FastAPI is lighter weight |
| Type System | TypeScript end-to-end | Python type hints + generated TS clients | Requires explicit type generation step |
| API Approach | GraphQL primary | REST primary (GraphQL optional) | Simpler in Python; OpenAPI provides similar benefits |
| ORM | Knex (query builder) | SQLAlchemy 2.0 (ORM + Core) | More abstraction; can drop to raw SQL when needed |
| Dependency Injection | Built into NestJS | Manual or lightweight (dependency-injector) | Slightly more explicit wiring |
| Async Model | Node.js event loop | Python asyncio | Equivalent capability; slightly different patterns |

### What Gets Simpler in Python

1. **Scoring and data processing**: Python's numpy/pandas ecosystem is unmatched for numerical work. Even for MVP, simple scoring calculations are more natural.

2. **Scripting and migrations**: Python's REPL and scripting capabilities make ad-hoc data tasks easier.

3. **Testing**: pytest is exceptionally clean—less boilerplate than Jest/Mocha.

4. **Deployment**: Single Python process is simpler than Node.js in some container scenarios.

### What Becomes Harder

1. **Type sharing with Angular**: This is the primary tradeoff. We lose seamless TypeScript type sharing and must generate client types from OpenAPI specs.

2. **GraphQL ergonomics**: While Strawberry is good, Python's GraphQL ecosystem is less mature than Node's Apollo stack.

3. **Async patterns**: Python's async/await works differently than Node.js. Mixing sync and async code requires care.

### Mitigations

| Challenge | Mitigation |
|-----------|------------|
| Type sharing | Generate TypeScript types from OpenAPI spec; run generation in CI |
| GraphQL complexity | Use REST as primary API; GraphQL optional for specific use cases |
| Async confusion | Use async consistently throughout; avoid mixing sync ORM calls |

---

## 1. Final Stack Decisions

### Backend: FastAPI + Python 3.11+

**Choice**: FastAPI framework

**Why**:
- Modern async-first design
- Automatic OpenAPI documentation (replaces GraphQL's self-documentation benefit)
- Pydantic for request/response validation with Python type hints
- Excellent performance for an internal tool
- Clean dependency injection pattern
- Large ecosystem, well-documented

**Not chosen**:
- Django: Too opinionated; ORM is heavy; admin panel not needed (we're building our own)
- Flask: Too minimal; would require assembling many pieces
- Litestar: Newer, smaller community

### Database: PostgreSQL + SQLAlchemy 2.0

**Choice**: SQLAlchemy 2.0 with asyncpg driver

**Why**:
- SQLAlchemy 2.0 is significantly improved: better typing, cleaner async
- Can use ORM for simple cases, drop to Core/raw SQL for complex queries
- Alembic for migrations (mature, reliable)
- Same PostgreSQL benefits as original plan (relational integrity, JSONB flexibility)

**Usage pattern**:
```python
# ORM for simple operations
user = await session.get(User, user_id)

# Core for complex queries where we want explicit SQL
stmt = select(Submission).where(
    Submission.competition_id == competition_id
).order_by(Submission.score.desc())
```

### API: REST Primary, GraphQL Optional

**Choice**: REST API with OpenAPI specification

**Why this differs from original plan**:

The original plan chose GraphQL primarily for:
1. Self-documenting API → FastAPI's OpenAPI provides this
2. Frontend requests exactly what it needs → Less critical for internal tool with known use cases
3. Type safety → Achieved via OpenAPI + TypeScript generation

For Python, REST provides:
- Simpler implementation and debugging
- Better tooling (httpx, requests, OpenAPI generators)
- Clearer HTTP semantics for operations like file upload
- Lower cognitive overhead for the team

**GraphQL escape hatch**:
If specific features benefit from GraphQL (e.g., complex dashboard queries), we can add Strawberry endpoints alongside REST. This is additive, not a rewrite.

### Type Generation: OpenAPI → TypeScript

**Approach**:
1. FastAPI generates OpenAPI spec automatically
2. CI runs `openapi-typescript` to generate TypeScript types
3. Angular app imports generated types

```bash
# In CI or as npm script
npx openapi-typescript http://localhost:8000/openapi.json -o src/api/types.ts
```

This creates a contract: if the Python API changes, TypeScript compilation fails until the frontend adapts.

---

## 2. Repository + Module Structure

### Monorepo Layout

```
daggle/
├── frontend/                    # Angular application (unchanged from original)
├── backend/                     # FastAPI application
├── shared/                      # OpenAPI spec, generated types
├── docker-compose.yml
├── docker-compose.prod.yml
├── Dockerfile.frontend
├── Dockerfile.backend
└── docs/
```

### Backend Structure

```
backend/
├── src/
│   ├── main.py                         # Application entry point
│   ├── config.py                       # Configuration from environment
│   │
│   ├── api/                            # HTTP layer
│   │   ├── __init__.py
│   │   ├── router.py                   # Main router combining all routes
│   │   ├── deps.py                     # Dependency injection (get_db, get_current_user)
│   │   │
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                 # Login, logout, token refresh
│   │   │   ├── competitions.py         # Competition CRUD
│   │   │   ├── submissions.py          # Submit, list submissions
│   │   │   ├── enrollments.py          # Enroll, unenroll
│   │   │   ├── leaderboard.py          # Leaderboard queries
│   │   │   ├── admin.py                # Admin-only operations
│   │   │   ├── upload.py               # File upload handling
│   │   │   └── health.py               # Health check endpoints
│   │   │
│   │   └── schemas/                    # Pydantic request/response models
│   │       ├── __init__.py
│   │       ├── competition.py
│   │       ├── submission.py
│   │       ├── user.py
│   │       └── common.py               # Shared schemas (pagination, errors)
│   │
│   ├── domain/                         # Business logic layer
│   │   ├── __init__.py
│   │   │
│   │   ├── competition/
│   │   │   ├── __init__.py
│   │   │   ├── service.py              # Competition business logic
│   │   │   ├── repository.py           # Database operations
│   │   │   └── models.py               # SQLAlchemy models
│   │   │
│   │   ├── submission/
│   │   │   ├── __init__.py
│   │   │   ├── service.py
│   │   │   ├── repository.py
│   │   │   ├── models.py
│   │   │   ├── scoring.py              # Scoring algorithms
│   │   │   └── validation.py           # File validation logic
│   │   │
│   │   ├── enrollment/
│   │   │   ├── __init__.py
│   │   │   ├── service.py
│   │   │   ├── repository.py
│   │   │   └── models.py
│   │   │
│   │   └── user/
│   │       ├── __init__.py
│   │       ├── service.py
│   │       ├── repository.py
│   │       └── models.py
│   │
│   ├── infrastructure/                 # Technical concerns
│   │   ├── __init__.py
│   │   │
│   │   ├── database/
│   │   │   ├── __init__.py
│   │   │   ├── session.py              # Async session management
│   │   │   └── base.py                 # SQLAlchemy base model
│   │   │
│   │   ├── auth/
│   │   │   ├── __init__.py
│   │   │   ├── jwt.py                  # JWT creation and validation
│   │   │   ├── password.py             # Password hashing
│   │   │   └── permissions.py          # Role/permission checking
│   │   │
│   │   ├── storage/
│   │   │   ├── __init__.py
│   │   │   └── file_storage.py         # File storage abstraction
│   │   │
│   │   └── logging/
│   │       ├── __init__.py
│   │       └── middleware.py           # Request logging middleware
│   │
│   └── common/
│       ├── __init__.py
│       ├── exceptions.py               # Custom exception classes
│       └── types.py                    # Shared type definitions
│
├── alembic/                            # Database migrations
│   ├── versions/
│   └── env.py
│
├── tests/
│   ├── conftest.py                     # pytest fixtures
│   ├── unit/
│   │   ├── test_scoring.py
│   │   └── test_validation.py
│   ├── integration/
│   │   ├── test_competitions.py
│   │   ├── test_submissions.py
│   │   └── test_permissions.py
│   └── factories/                      # Test data factories
│       ├── __init__.py
│       └── factories.py
│
├── alembic.ini
├── pyproject.toml                      # Project config, dependencies
├── requirements.txt                    # Pinned dependencies for Docker
└── pytest.ini
```

### Frontend Structure

Unchanged from original plan. Angular application with:
- `core/` - Singleton services
- `shared/` - Reusable components
- `features/` - Feature modules (competition, home, profile)

The only difference: TypeScript types are generated from OpenAPI rather than shared from a common package.

### Layer Boundaries

| Layer | Responsibility | Can Import | Cannot Import |
|-------|---------------|------------|---------------|
| `api/routes` | HTTP handling, request validation, response shaping | `domain/services`, `api/schemas` | `domain/repositories`, `infrastructure` internals |
| `api/schemas` | Pydantic models for API contracts | `common/types` | Domain models directly |
| `domain/services` | Business logic, orchestration | `domain/repositories`, `infrastructure` interfaces | `api/`, other domain modules |
| `domain/repositories` | Database access | `domain/models`, `infrastructure/database` | Services, API |
| `domain/models` | SQLAlchemy model definitions | `infrastructure/database/base` | Everything else |
| `infrastructure` | Technical implementations | Nothing domain-specific | Domain, API |

---

## 3. API Design

### RESTful Resource Structure

```
Authentication
POST   /api/auth/login              # Get access + refresh tokens
POST   /api/auth/refresh            # Refresh access token
POST   /api/auth/logout             # Invalidate refresh token

Competitions
GET    /api/competitions            # List competitions
POST   /api/competitions            # Create competition (becomes sponsor)
GET    /api/competitions/:id        # Get competition details
PATCH  /api/competitions/:id        # Update competition (sponsor only)

Enrollments
POST   /api/competitions/:id/enroll     # Enroll in competition
DELETE /api/competitions/:id/enroll     # Unenroll from competition
GET    /api/competitions/:id/enrollment # Get user's enrollment status

Submissions
GET    /api/competitions/:id/submissions      # List user's submissions
POST   /api/competitions/:id/submissions      # Submit predictions
GET    /api/competitions/:id/submissions/:sid # Get submission details

Leaderboard
GET    /api/competitions/:id/leaderboard           # Full leaderboard
GET    /api/competitions/:id/leaderboard/around-me # Context around user

Admin (Sponsor) Operations
GET    /api/competitions/:id/admin/stats           # Competition statistics
GET    /api/competitions/:id/admin/submissions     # All submissions (admin view)
GET    /api/competitions/:id/admin/participants    # Participant list
POST   /api/competitions/:id/admin/announce        # Send announcement
PATCH  /api/competitions/:id/admin/submissions/:sid # Invalidate submission

File Upload
POST   /api/upload                  # Upload file, returns file_id
GET    /api/files/:id               # Download file

Health
GET    /api/health/live             # Liveness probe
GET    /api/health/ready            # Readiness probe
```

### Request/Response Examples

**Get Competition (includes user context)**:

```python
# GET /api/competitions/abc-123

# Response varies based on user's relationship to competition
{
  "id": "abc-123",
  "title": "Customer Churn Prediction",
  "description": "...",
  "status": "active",
  "deadline": "2025-02-05T23:59:59Z",
  "metric": "auc_roc",
  "participantCount": 234,

  # User context - determines UI mode
  "userContext": {
    "role": "participant",  # "viewer" | "participant" | "sponsor"
    "enrolledAt": "2025-01-15T10:30:00Z",
    "bestScore": 0.8234,
    "rank": 12,
    "submissionsToday": 3,
    "submissionsLimit": 5
  }
}
```

**Submit Predictions**:

```python
# POST /api/competitions/abc-123/submissions
# Content-Type: multipart/form-data
# file: predictions.csv

# Success Response
{
  "id": "sub-456",
  "status": "scored",
  "score": 0.8234,
  "rank": 12,
  "previousRank": 15,
  "submittedAt": "2025-01-24T14:30:00Z",
  "validationErrors": null
}

# Validation Error Response (400)
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Submission file is invalid",
    "details": [
      {"field": "churn_probability", "error": "Values must be between 0 and 1"},
      {"field": "customer_id", "error": "Missing 47 expected IDs"}
    ]
  }
}

# Rate Limit Response (429)
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Daily submission limit reached",
    "details": {
      "limit": 5,
      "used": 5,
      "resetsAt": "2025-01-25T00:00:00Z"
    }
  }
}
```

### Pydantic Schema Design

```python
# api/schemas/competition.py

from pydantic import BaseModel
from datetime import datetime
from enum import Enum

class CompetitionStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ENDED = "ended"

class UserRole(str, Enum):
    VIEWER = "viewer"
    PARTICIPANT = "participant"
    SPONSOR = "sponsor"

class UserContext(BaseModel):
    role: UserRole
    enrolled_at: datetime | None = None
    best_score: float | None = None
    rank: int | None = None
    submissions_today: int = 0
    submissions_limit: int = 5

class CompetitionResponse(BaseModel):
    id: str
    title: str
    description: str
    status: CompetitionStatus
    deadline: datetime
    metric: str
    participant_count: int
    user_context: UserContext

    class Config:
        from_attributes = True  # Allow ORM model conversion
```

---

## 4. Permissions & Mode Handling

### Permission Model

Same conceptual model as original plan:

```python
# infrastructure/auth/permissions.py

from enum import Enum

class Role(str, Enum):
    VIEWER = "viewer"           # Authenticated, not enrolled
    PARTICIPANT = "participant" # Enrolled in competition
    SPONSOR = "sponsor"         # Created/owns competition
    ADMIN = "admin"             # Platform admin (future)

# Role hierarchy for permission checks
ROLE_HIERARCHY = {
    Role.VIEWER: 0,
    Role.PARTICIPANT: 1,
    Role.SPONSOR: 2,
    Role.ADMIN: 3,
}

def has_permission(user_role: Role, required_role: Role) -> bool:
    return ROLE_HIERARCHY[user_role] >= ROLE_HIERARCHY[required_role]
```

### Determining User Role

```python
# domain/enrollment/service.py

class EnrollmentService:
    def __init__(self, enrollment_repo: EnrollmentRepository, competition_repo: CompetitionRepository):
        self.enrollment_repo = enrollment_repo
        self.competition_repo = competition_repo

    async def get_user_role(self, user_id: str, competition_id: str) -> Role:
        """Determine user's role for a specific competition."""

        # Check if user is the sponsor
        competition = await self.competition_repo.get_by_id(competition_id)
        if competition.sponsor_id == user_id:
            return Role.SPONSOR

        # Check if user is enrolled
        enrollment = await self.enrollment_repo.get_enrollment(user_id, competition_id)
        if enrollment:
            return Role.PARTICIPANT

        return Role.VIEWER

    async def get_user_context(self, user_id: str, competition_id: str) -> UserContext:
        """Get full user context for a competition."""
        role = await self.get_user_role(user_id, competition_id)

        context = UserContext(role=role)

        if role in (Role.PARTICIPANT, Role.SPONSOR):
            enrollment = await self.enrollment_repo.get_enrollment(user_id, competition_id)
            context.enrolled_at = enrollment.created_at

            # Get submission stats
            stats = await self.submission_repo.get_user_stats(user_id, competition_id)
            context.best_score = stats.best_score
            context.rank = stats.rank
            context.submissions_today = stats.submissions_today

        return context
```

### Enforcing Permissions in Routes

```python
# api/deps.py

from fastapi import Depends, HTTPException, status
from infrastructure.auth.permissions import Role, has_permission

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Extract and validate current user from JWT."""
    # ... JWT validation logic
    return user

async def get_competition_context(
    competition_id: str,
    current_user: User = Depends(get_current_user),
    enrollment_service: EnrollmentService = Depends(get_enrollment_service)
) -> tuple[Competition, Role]:
    """Get competition and user's role for it."""
    competition = await competition_service.get_by_id(competition_id)
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")

    role = await enrollment_service.get_user_role(current_user.id, competition_id)
    return competition, role

def require_role(required: Role):
    """Dependency that enforces a minimum role."""
    async def checker(
        context: tuple[Competition, Role] = Depends(get_competition_context)
    ) -> tuple[Competition, Role]:
        competition, role = context
        if not has_permission(role, required):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires {required.value} role"
            )
        return context
    return checker
```

### Using Permission Dependencies in Routes

```python
# api/routes/submissions.py

from fastapi import APIRouter, Depends, UploadFile
from api.deps import require_role, get_current_user
from infrastructure.auth.permissions import Role

router = APIRouter(prefix="/competitions/{competition_id}/submissions")

@router.post("")
async def submit_predictions(
    competition_id: str,
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    context: tuple = Depends(require_role(Role.PARTICIPANT)),  # Must be enrolled
    submission_service: SubmissionService = Depends(get_submission_service)
):
    """Submit predictions for scoring."""
    competition, role = context
    result = await submission_service.submit(
        user_id=current_user.id,
        competition_id=competition_id,
        file=file
    )
    return result

# api/routes/admin.py

router = APIRouter(prefix="/competitions/{competition_id}/admin")

@router.get("/stats")
async def get_competition_stats(
    competition_id: str,
    context: tuple = Depends(require_role(Role.SPONSOR)),  # Must be sponsor
    admin_service: AdminService = Depends(get_admin_service)
):
    """Get competition statistics (sponsor only)."""
    competition, role = context
    return await admin_service.get_stats(competition_id)
```

### Keeping It Clean (Avoiding If-Statement Spaghetti)

Same principles as original plan:

1. **Routes determine mode**: `/competitions/:id` vs `/competitions/:id/admin/*`
2. **Dependencies check permissions once**: `require_role()` at route level
3. **Services assume authorization passed**: No re-checking inside business logic
4. **Backend is the authority**: Frontend adapts UI, backend enforces rules

---

## 5. Testing Strategy

### Test Organization

```
tests/
├── conftest.py                 # Shared fixtures
├── unit/                       # Pure logic tests (no DB, no HTTP)
│   ├── test_scoring.py
│   ├── test_validation.py
│   ├── test_permissions.py
│   └── test_rank_calculation.py
├── integration/                # API + Database tests
│   ├── test_auth.py
│   ├── test_competitions.py
│   ├── test_submissions.py
│   ├── test_enrollments.py
│   └── test_admin.py
└── factories/                  # Test data factories
    └── factories.py
```

### Fixtures and Test Database

```python
# tests/conftest.py

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

@pytest.fixture
async def db_session():
    """Create a fresh database for each test."""
    engine = create_async_engine("postgresql+asyncpg://test:test@localhost/daggle_test")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSession(engine) as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def client(db_session):
    """Test client with database session."""
    app.dependency_overrides[get_db] = lambda: db_session
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()

@pytest.fixture
async def authenticated_client(client, db_session):
    """Client with authenticated user."""
    user = await UserFactory.create(session=db_session)
    token = create_access_token(user.id)
    client.headers["Authorization"] = f"Bearer {token}"
    client.user = user
    return client
```

### Unit Tests

**What to unit test**: Pure functions with no external dependencies

```python
# tests/unit/test_scoring.py

import pytest
from domain.submission.scoring import calculate_auc_roc

class TestAucRocCalculation:
    def test_perfect_predictions_returns_one(self):
        predictions = [
            {"id": "1", "probability": 0.9},
            {"id": "2", "probability": 0.1},
        ]
        actuals = [
            {"id": "1", "churned": True},
            {"id": "2", "churned": False},
        ]

        score = calculate_auc_roc(predictions, actuals)
        assert score == 1.0

    def test_inverse_predictions_returns_zero(self):
        predictions = [
            {"id": "1", "probability": 0.1},
            {"id": "2", "probability": 0.9},
        ]
        actuals = [
            {"id": "1", "churned": True},
            {"id": "2", "churned": False},
        ]

        score = calculate_auc_roc(predictions, actuals)
        assert score == 0.0

    def test_random_predictions_returns_approximately_half(self):
        # Large sample with random predictions
        predictions = [{"id": str(i), "probability": 0.5} for i in range(1000)]
        actuals = [{"id": str(i), "churned": i % 2 == 0} for i in range(1000)]

        score = calculate_auc_roc(predictions, actuals)
        assert 0.45 <= score <= 0.55


# tests/unit/test_validation.py

from domain.submission.validation import validate_submission_file

class TestSubmissionValidation:
    def test_accepts_valid_csv(self):
        content = "customer_id,churn_probability\n1,0.5\n2,0.3"
        result = validate_submission_file(content, expected_ids=["1", "2"])

        assert result.valid is True
        assert result.errors == []

    def test_rejects_missing_column(self):
        content = "id,probability\n1,0.5"
        result = validate_submission_file(content, expected_ids=["1"])

        assert result.valid is False
        assert any(e.code == "MISSING_COLUMN" for e in result.errors)

    def test_rejects_probability_out_of_range(self):
        content = "customer_id,churn_probability\n1,1.5"
        result = validate_submission_file(content, expected_ids=["1"])

        assert result.valid is False
        assert any(e.code == "VALUE_OUT_OF_RANGE" for e in result.errors)
```

### Integration Tests

**What to integration test**: API endpoints with real database

```python
# tests/integration/test_submissions.py

import pytest
from httpx import AsyncClient

class TestSubmissionAPI:
    @pytest.mark.asyncio
    async def test_submit_valid_file_returns_score(
        self, authenticated_client: AsyncClient, db_session
    ):
        # Setup: create competition and enroll user
        competition = await CompetitionFactory.create(session=db_session, status="active")
        await EnrollmentFactory.create(
            session=db_session,
            user_id=authenticated_client.user.id,
            competition_id=competition.id
        )

        # Submit
        files = {"file": ("predictions.csv", create_valid_csv(), "text/csv")}
        response = await authenticated_client.post(
            f"/api/competitions/{competition.id}/submissions",
            files=files
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "scored"
        assert "score" in data
        assert "rank" in data

    @pytest.mark.asyncio
    async def test_submit_without_enrollment_returns_403(
        self, authenticated_client: AsyncClient, db_session
    ):
        competition = await CompetitionFactory.create(session=db_session, status="active")
        # User is NOT enrolled

        files = {"file": ("predictions.csv", create_valid_csv(), "text/csv")}
        response = await authenticated_client.post(
            f"/api/competitions/{competition.id}/submissions",
            files=files
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_submit_exceeding_daily_limit_returns_429(
        self, authenticated_client: AsyncClient, db_session
    ):
        competition = await CompetitionFactory.create(
            session=db_session,
            status="active",
            daily_submission_limit=5
        )
        await EnrollmentFactory.create(
            session=db_session,
            user_id=authenticated_client.user.id,
            competition_id=competition.id
        )
        # Create 5 submissions (at limit)
        for _ in range(5):
            await SubmissionFactory.create(
                session=db_session,
                user_id=authenticated_client.user.id,
                competition_id=competition.id
            )

        files = {"file": ("predictions.csv", create_valid_csv(), "text/csv")}
        response = await authenticated_client.post(
            f"/api/competitions/{competition.id}/submissions",
            files=files
        )

        assert response.status_code == 429
        assert response.json()["error"]["code"] == "RATE_LIMIT_EXCEEDED"
```

### E2E Tests (Playwright)

**Unchanged from original plan**. Playwright tests remain the primary regression guardrail:

```typescript
// e2e/journeys/submission-flow.spec.ts

test('enrolled user can submit and see score', async ({ page }) => {
  await loginAs(page, 'participant@test.com');
  await page.goto('/competitions/test-competition');

  // Verify participant mode
  await expect(page.locator('[data-testid="enrolled-badge"]')).toBeVisible();

  // Submit
  await page.click('[data-testid="submit-tab"]');
  await page.setInputFiles('[data-testid="file-input"]', 'fixtures/valid.csv');
  await page.click('[data-testid="submit-button"]');

  // Verify result
  await expect(page.locator('[data-testid="submission-score"]')).toBeVisible();
  await expect(page.locator('[data-testid="submission-rank"]')).toBeVisible();
});
```

### Must-Have Tests for MVP

```
Unit Tests
├── Scoring algorithm: perfect, inverse, random, edge cases
├── Validation: valid CSV, missing columns, out-of-range values, wrong IDs
├── Permission hierarchy: viewer < participant < sponsor
└── Rank calculation: ties, updates, position changes

Integration Tests
├── Auth: login, token refresh, invalid token
├── Competitions: list, get, create (becomes sponsor), update (sponsor only)
├── Enrollments: enroll, unenroll, duplicate enrollment
├── Submissions: submit, validate, rate limit, score storage
├── Leaderboard: ranking, around-me query
└── Admin: stats, participant list, submission management

E2E Tests (Playwright)
├── Discovery: browse competitions, view details
├── Enrollment: join competition, see participant UI
├── Submission: upload file, see score and rank
├── Admin: create competition, update settings
└── Layout: tab stability, mode switching
```

---

## 6. Deployment & Runtime

### Docker Configuration

**Backend Dockerfile**:

```dockerfile
# Dockerfile.backend
FROM python:3.11-slim

# Create non-root user
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY --chown=appuser:appuser src/ ./src/
COPY --chown=appuser:appuser alembic/ ./alembic/
COPY --chown=appuser:appuser alembic.ini .

# Switch to non-root user
USER appuser

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import httpx; httpx.get('http://localhost:8000/api/health/live')"

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Docker Compose for Development**:

```yaml
# docker-compose.yml
version: "3.8"

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "4200:4200"
    volumes:
      - ./frontend/src:/app/src
    environment:
      - API_URL=http://backend:8000
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - ./backend/src:/app/src  # Live reload
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/daggle
      - JWT_SECRET=dev-secret-change-in-production
      - LOG_LEVEL=DEBUG
      - CORS_ORIGINS=http://localhost:4200
    depends_on:
      db:
        condition: service_healthy
    command: uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

  db:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=daggle
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

### Configuration

```python
# src/config.py

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    database_url: str

    # Auth
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # CORS
    cors_origins: list[str] = ["http://localhost:4200"]

    # Storage
    upload_dir: str = "/tmp/uploads"
    max_upload_size_mb: int = 100

    # Logging
    log_level: str = "INFO"
    log_format: str = "json"  # "json" or "text"

    class Config:
        env_file = ".env"

settings = Settings()
```

### Health Endpoints

```python
# api/routes/health.py

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/health")

@router.get("/live")
async def liveness():
    """Kubernetes liveness probe - is the process running?"""
    return {"status": "ok"}

@router.get("/ready")
async def readiness(db: AsyncSession = Depends(get_db)):
    """Kubernetes readiness probe - can we serve requests?"""
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "database": "disconnected", "detail": str(e)}
        )
```

### Structured Logging

```python
# infrastructure/logging/config.py

import logging
import json
import sys
from datetime import datetime

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
        }

        # Add extra fields if present
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data)

def setup_logging(level: str = "INFO", format: str = "json"):
    logger = logging.getLogger()
    logger.setLevel(getattr(logging, level.upper()))

    handler = logging.StreamHandler(sys.stdout)
    if format == "json":
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        ))

    logger.addHandler(handler)


# infrastructure/logging/middleware.py

import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))

        # Attach to request state for use in route handlers
        request.state.request_id = request_id

        logger.info(
            "Request started",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
            }
        )

        response = await call_next(request)

        logger.info(
            "Request completed",
            extra={
                "request_id": request_id,
                "status_code": response.status_code,
            }
        )

        response.headers["X-Request-ID"] = request_id
        return response
```

### OpenShift Compatibility

**Key constraints respected**:
- Non-root user in container
- All config via environment variables
- Health endpoints for probes
- No persistent local storage assumptions
- Stateless application (session in JWT, files in external storage)

**Kubernetes manifest example** (for reference):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: daggle-backend
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: backend
          image: daggle-backend:latest
          ports:
            - containerPort: 8000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: daggle-secrets
                  key: database-url
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: daggle-secrets
                  key: jwt-secret
          livenessProbe:
            httpGet:
              path: /api/health/live
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/health/ready
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 10
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          securityContext:
            runAsNonRoot: true
            runAsUser: 1000
```

---

## 7. Iteration Plan (Milestones)

Same six milestones as original plan, with Python-specific implementation details.

### Milestone 1: Foundation
**Goal**: Running development environment with authentication

**Deliverables**:
- [ ] Monorepo structure created
- [ ] Angular app scaffolded (from prototype)
- [ ] FastAPI app scaffolded
- [ ] PostgreSQL in Docker Compose
- [ ] SQLAlchemy models and Alembic migrations setup
- [ ] Basic auth endpoints (login, token refresh)
- [ ] Health endpoints working
- [ ] OpenAPI spec generating correctly
- [ ] TypeScript type generation from OpenAPI

**Definition of Done**:
- `docker-compose up` starts all services
- Frontend can authenticate and display logged-in user
- OpenAPI docs accessible at `/docs`
- Health check returns 200

### Milestone 2: Competition Display
**Goal**: Discovery mode fully functional

**Deliverables**:
- [ ] Competition database models + migrations
- [ ] Competition list endpoint
- [ ] Competition detail endpoint (with user context)
- [ ] Angular competition pages connected to API
- [ ] Seeded test data

**Definition of Done**:
- User can browse competition list
- User can view competition details
- User context correctly shows "viewer" role
- E2E test passing

### Milestone 3: Enrollment + Participant Mode
**Goal**: Users can enroll and see participant-specific UI

**Deliverables**:
- [ ] Enrollment models + migrations
- [ ] Enroll/unenroll endpoints
- [ ] User context includes enrollment status
- [ ] Leaderboard endpoint
- [ ] Angular participant components connected

**Definition of Done**:
- User can enroll in competition
- User context shows "participant" role after enrollment
- Leaderboard displays correctly
- E2E test passing

### Milestone 4: Submissions + Scoring
**Goal**: Core functionality—users can submit and get scored

**Deliverables**:
- [ ] Submission models + migrations
- [ ] File upload endpoint
- [ ] Submission validation logic
- [ ] Scoring implementation (AUC-ROC)
- [ ] Rank calculation and storage
- [ ] Daily limit enforcement
- [ ] Angular submission components connected

**Definition of Done**:
- User can upload CSV submission
- Submission is validated and scored
- Rank updates on leaderboard
- Daily limit enforced
- E2E test passing

### Milestone 5: Admin Mode
**Goal**: Sponsors can create and manage competitions

**Deliverables**:
- [ ] Competition create endpoint (user becomes sponsor)
- [ ] Competition update endpoint (sponsor only)
- [ ] Admin statistics endpoint
- [ ] Admin submission management
- [ ] Audit logging for admin actions
- [ ] Angular admin components connected

**Definition of Done**:
- User can create competition and becomes sponsor
- Sponsor can access admin endpoints
- Non-sponsors get 403
- Admin actions are logged
- E2E test passing

### Milestone 6: Polish + Deploy Prep
**Goal**: Production-ready MVP

**Deliverables**:
- [ ] Error handling polished
- [ ] Loading states in UI
- [ ] Form validation with feedback
- [ ] Full test suite passing
- [ ] Production Docker builds
- [ ] OpenShift deployment manifests
- [ ] README with setup instructions

**Definition of Done**:
- All E2E tests pass
- All integration tests pass
- Application builds for production
- Can deploy to OpenShift-like environment
- Developer can set up locally from README

---

## 8. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Type drift between Python and Angular | Medium | Medium | Generate TS types in CI; fail build on mismatch |
| Async/sync confusion in SQLAlchemy | Medium | Low | Use async consistently; lint for sync calls |
| Slower development vs TypeScript E2E | Low | Medium | Python is productive; team likely has Python experience |
| Scoring performance (synchronous) | Low | Low | NumPy is fast; can optimize later if needed |
| GraphQL demand from frontend team | Medium | Low | REST meets needs; can add Strawberry endpoints if required |

### Risk: Type Safety Gap

**Concern**: Without shared TypeScript types, the frontend might drift from backend expectations.

**Mitigations**:
1. **Generate types in CI**: Every backend change triggers type regeneration
2. **Frontend compilation catches mismatches**: TypeScript build fails if types don't match usage
3. **Integration tests verify contracts**: API tests are the source of truth
4. **Pydantic enforces backend contracts**: Runtime validation catches issues early

### Risk: Python Performance for Scoring

**Concern**: Python is slower than Node.js for CPU-bound work.

**Reality check**:
- Scoring a single submission (thousands of rows) takes milliseconds with NumPy
- MVP has at most hundreds of concurrent users
- If performance becomes an issue, extract scoring to a worker (not needed for MVP)

---

## 9. Summary Checklist

### Decisions Made

- [x] Backend: FastAPI + Python 3.11+
- [x] Database: PostgreSQL + SQLAlchemy 2.0 + Alembic
- [x] API: REST primary (GraphQL optional via Strawberry)
- [x] Type sharing: OpenAPI → TypeScript generation
- [x] Auth: JWT with bcrypt password hashing
- [x] Container: Non-root, env-based config, health endpoints

### Key Differences from Original Plan

| Aspect | Original | Python Variant |
|--------|----------|----------------|
| Backend | NestJS | FastAPI |
| Type sharing | Native TypeScript | Generated from OpenAPI |
| API style | GraphQL primary | REST primary |
| ORM | Knex (query builder) | SQLAlchemy 2.0 (ORM + Core) |
| DI pattern | Framework-provided | FastAPI Depends() |

### Implementation Order

1. [ ] **Milestone 1**: Foundation (auth, health, type generation)
2. [ ] **Milestone 2**: Competition display (discovery mode)
3. [ ] **Milestone 3**: Enrollment + participant mode
4. [ ] **Milestone 4**: Submissions + scoring
5. [ ] **Milestone 5**: Admin mode
6. [ ] **Milestone 6**: Polish + deployment prep

### Test Coverage Requirements

- [ ] Unit: 100+ tests (scoring, validation, permissions)
- [ ] Integration: 50+ tests (API + DB)
- [ ] E2E: 10-15 Playwright tests (unchanged from original)
