# Backend Architecture

FastAPI application with layered architecture, async database operations, and pluggable storage.

## Technology Stack

| Technology | Purpose |
|------------|---------|
| FastAPI | Web framework |
| SQLAlchemy 2.0 | ORM (async) |
| PostgreSQL | Database |
| Alembic | Migrations |
| Pydantic | Validation |
| JWT + bcrypt | Authentication |
| Celery + Redis | Task queue |

## Layered Architecture

```mermaid
flowchart TB
    subgraph Presentation["Presentation Layer"]
        Routes[API Routes]
        Schemas[Pydantic Schemas]
    end

    subgraph Domain["Domain Layer"]
        Services[Services]
        Models[SQLAlchemy Models]
        Scoring[Scoring Logic]
    end

    subgraph Infrastructure["Infrastructure Layer"]
        Repos[Repositories]
        Storage[Storage Backend]
        Database[(PostgreSQL)]
        Tasks[Celery Tasks]
    end

    subgraph CrossCutting["Cross-Cutting"]
        Security[Security]
        Config[Configuration]
        Dependencies[DI Dependencies]
    end

    Routes --> Services
    Services --> Repos
    Services --> Storage
    Repos --> Database
    Tasks --> Services
```

## Directory Structure

```
backend/src/
├── api/
│   ├── routes/           # HTTP endpoints
│   ├── schemas/          # Request/response models
│   └── dependencies.py   # Dependency injection
├── domain/
│   ├── models/           # SQLAlchemy ORM models
│   ├── services/         # Business logic
│   └── scoring/          # Submission scoring
├── infrastructure/
│   ├── repositories/     # Data access layer
│   ├── storage/          # File storage (local/S3)
│   ├── tasks/            # Celery async tasks
│   └── database.py       # DB connection
├── common/
│   ├── security.py       # Auth utilities
│   └── utils.py          # Shared utilities
├── config.py             # Settings
└── main.py               # App entrypoint
```

## Request Flow

```mermaid
sequenceDiagram
    participant Client
    participant Route
    participant Deps as Dependencies
    participant Service
    participant Repo as Repository
    participant DB as Database

    Client->>Route: HTTP Request
    Route->>Deps: get_db(), get_current_user()
    Deps-->>Route: Session, User
    Route->>Service: Business operation
    Service->>Service: Validate rules
    Service->>Repo: Data operation
    Repo->>DB: SQL query
    DB-->>Repo: Result
    Repo-->>Service: Model
    Service-->>Route: Result
    Route-->>Client: JSON Response
```

## API Routes

```mermaid
flowchart LR
    subgraph Routes["API Routes (/api)"]
        Health["/health"]
        Auth["/auth"]
        Comp["/competitions"]
        Sub["/submissions"]
        Teams["/teams"]
        Discuss["/discussions"]
        Enroll["/enrollments"]
        Notify["/notifications"]
        Profile["/profiles"]
        Dashboard["/dashboard"]
        Admin["/admin"]
    end
```

### Route Endpoints

| Route | Key Endpoints |
|-------|---------------|
| `/health` | `GET /live`, `GET /ready` |
| `/auth` | `POST /register`, `POST /login`, `GET /me` |
| `/competitions` | CRUD, `POST /{slug}/thumbnail`, `POST /{slug}/truth-set` |
| `/submissions` | `POST /`, `GET /leaderboard` |
| `/teams` | CRUD, member management, invitations |
| `/discussions` | Threads, replies |
| `/enrollments` | `POST /enroll`, `DELETE /withdraw` |
| `/notifications` | `GET /`, `PATCH /{id}/read` |
| `/profiles` | `GET /{username}`, `PATCH /` |
| `/dashboard` | `GET /` (aggregated stats) |
| `/admin` | User management, platform stats |

## Domain Services

```mermaid
flowchart TB
    subgraph Services["Domain Services"]
        AuthSvc[AuthService]
        CompSvc[CompetitionService]
        SubSvc[SubmissionService]
        TeamSvc[TeamService]
        EnrollSvc[EnrollmentService]
        DiscussSvc[DiscussionService]
        NotifySvc[NotificationService]
        ProfileSvc[ProfileService]
        FileSvc[CompetitionFileService]
        DictSvc[DataDictionaryService]
        FAQSvc[FAQService]
        RuleSvc[RuleService]
    end

    subgraph Repos["Repositories"]
        UserRepo[UserRepository]
        CompRepo[CompetitionRepository]
        SubRepo[SubmissionRepository]
        TeamRepo[TeamRepository]
        EnrollRepo[EnrollmentRepository]
    end

    AuthSvc --> UserRepo
    CompSvc --> CompRepo
    SubSvc --> SubRepo
    TeamSvc --> TeamRepo
    EnrollSvc --> EnrollRepo
```

### Service Responsibilities

| Service | Purpose |
|---------|---------|
| **AuthService** | Registration, authentication, token creation |
| **CompetitionService** | Competition CRUD, truth set uploads |
| **SubmissionService** | Submit predictions, trigger scoring |
| **TeamService** | Team management, invitations |
| **EnrollmentService** | Competition enrollment |
| **DiscussionService** | Threads and replies |
| **NotificationService** | User notifications |
| **ProfileService** | User profiles and stats |
| **CompetitionFileService** | File uploads and downloads |
| **DataDictionaryService** | Column detection and definitions |
| **FAQService** | Competition FAQs |
| **RuleService** | Competition rules from templates |

## Repository Pattern

```mermaid
classDiagram
    class BaseRepository~T~ {
        +session: AsyncSession
        +model: Type[T]
        +get_by_id(id) T
        +get_all() List[T]
        +create(obj) T
        +update(obj) T
        +delete(id) bool
    }

    class UserRepository {
        +get_by_email(email) User
        +email_exists(email) bool
        +username_exists(username) bool
    }

    class CompetitionRepository {
        +get_by_slug(slug) Competition
        +get_active() List[Competition]
        +slug_exists(slug) bool
    }

    class SubmissionRepository {
        +get_by_user(user_id) List[Submission]
        +count_today_by_user(user_id) int
        +list_leaderboard(comp_id) List
    }

    BaseRepository <|-- UserRepository
    BaseRepository <|-- CompetitionRepository
    BaseRepository <|-- SubmissionRepository
```

## Storage Backend

```mermaid
flowchart TB
    Service[Service Layer]
    Factory[get_storage_backend]

    Service --> Factory

    Factory --> Local[LocalStorageBackend]
    Factory --> S3[S3StorageBackend]

    Local --> FS[(Local Filesystem)]
    S3 --> AWS[(S3 / MinIO)]

    subgraph Interface["StorageBackend Protocol"]
        Save[save key, content]
        Load[load key]
        Delete[delete key]
        Exists[exists key]
        GetURL[get_url key]
    end
```

Storage backend is selected via `STORAGE_BACKEND` environment variable:
- `local` - Saves to filesystem (default for development)
- `s3` - Saves to AWS S3 or MinIO

## Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant Route
    participant Deps
    participant Security
    participant DB

    Client->>Route: Request + Bearer token
    Route->>Deps: get_current_user()
    Deps->>Security: decode_access_token(token)
    Security-->>Deps: user_id
    Deps->>DB: SELECT user WHERE id = user_id
    DB-->>Deps: User record
    Deps-->>Route: User object
    Route->>Route: Check role if needed
```

### Security Components

| Component | Purpose |
|-----------|---------|
| `hash_password()` | bcrypt password hashing |
| `verify_password()` | Password verification |
| `create_access_token()` | JWT generation |
| `decode_access_token()` | JWT validation |

## Dependency Injection

```python
# Common dependencies
async def get_db() -> AsyncSession
async def get_current_user(token, db) -> User
async def get_current_active_user(user) -> User

# Role-based dependencies
require_sponsor = require_role(UserRole.SPONSOR, UserRole.ADMIN)
require_admin = require_role(UserRole.ADMIN)
```

## Submission Scoring Flow

```mermaid
sequenceDiagram
    participant Client
    participant Route
    participant SubService
    participant Storage
    participant Celery
    participant Scorer

    Client->>Route: POST /submit (file)
    Route->>SubService: submit(file, user)
    SubService->>SubService: Validate format
    SubService->>Storage: Save submission file
    SubService->>DB: Create submission (PENDING)
    SubService->>Celery: score_submission.delay(id)
    SubService-->>Route: Submission (PENDING)
    Route-->>Client: 201 Created

    Note over Celery,Scorer: Async processing
    Celery->>Storage: Load submission
    Celery->>Storage: Load truth set
    Celery->>Scorer: Calculate score
    Scorer-->>Celery: Score
    Celery->>DB: Update submission (SCORED)
```

## Error Handling

Routes use `HTTPException` with appropriate status codes:

| Status | Usage |
|--------|-------|
| 400 | Bad request, validation errors |
| 401 | Authentication required |
| 403 | Forbidden (wrong role) |
| 404 | Resource not found |
| 409 | Conflict (duplicate) |
| 422 | Validation error (Pydantic) |

## Configuration

Environment variables loaded via `config.py`:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection |
| `SECRET_KEY` | JWT signing key |
| `STORAGE_BACKEND` | `local` or `s3` |
| `S3_BUCKET` | S3 bucket name |
| `CELERY_BROKER_URL` | Redis URL for tasks |
| `ADMIN_EMAIL` | Bootstrap admin email |
| `ADMIN_PASSWORD` | Bootstrap admin password |

## Database Migrations

Alembic manages schema migrations:

```bash
# Run pending migrations
alembic upgrade head

# Generate new migration
alembic revision --autogenerate -m "Description"

# Rollback one migration
alembic downgrade -1
```

Migrations run automatically on container startup via the entrypoint script.
