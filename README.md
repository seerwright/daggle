# Daggle

A platform for hosting data science competitions. Teams can compete on machine learning challenges, submit predictions, and track their performance on leaderboards.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.11+, FastAPI, SQLAlchemy 2.0, Alembic |
| Frontend | Angular 18, Angular Material |
| Database | PostgreSQL 16 |
| Infrastructure | Docker, Docker Compose |
| Testing | Playwright (E2E), pytest (Backend) |

## Prerequisites

- **Docker** and **Docker Compose** (v2.0+)
- **Node.js** 20+ (only needed for running Playwright tests locally)
- **Git**

## Quickstart

### 1. Clone and Start

```bash
git clone git@github.com:seerwright/daggle.git
cd daggle
docker compose up --build
```

This will:
- Build the backend and frontend Docker images
- Start PostgreSQL database
- Run database migrations automatically
- Create an admin user (configured in docker-compose.yml)
- Start the application

### 2. Access the Application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:4200 |
| Backend API | http://localhost:8000 |
| API Documentation (Swagger) | http://localhost:8000/docs |
| API Documentation (ReDoc) | http://localhost:8000/redoc |

### 3. Login

Default admin credentials (configured in `docker-compose.yml`):
- **Email:** `admin@daggle.example.com`
- **Password:** `password123`

## Configuration

### Admin User

The admin user is created automatically on startup. Configure credentials in `docker-compose.yml`:

```yaml
backend:
  environment:
    ADMIN_EMAIL: admin@daggle.example.com
    ADMIN_PASSWORD: password123
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Set in docker-compose |
| `SECRET_KEY` | JWT signing key | Auto-generated |
| `ADMIN_EMAIL` | Admin user email | `admin@daggle.example.com` |
| `ADMIN_PASSWORD` | Admin user password | `password123` |
| `UPLOAD_DIR` | File upload directory | `/tmp/daggle/uploads` |

## Health Checks

```bash
# Liveness probe - is the service running?
curl http://localhost:8000/health/live

# Readiness probe - is the service ready to accept requests?
curl http://localhost:8000/health/ready
```

## Running Tests

### Playwright E2E Tests

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test tests/thumbnail-upload.spec.ts

# Run tests with UI
npx playwright test --ui

# Run tests in headed mode (see the browser)
npx playwright test --headed
```

### Backend Tests

```bash
# Run pytest inside the container
docker compose exec backend pytest

# Run with coverage
docker compose exec backend pytest --cov=src
```

## Development

### Rebuilding After Changes

```bash
# Rebuild and restart all services
docker compose up --build

# Rebuild specific service
docker compose up --build backend
docker compose up --build frontend
```

### Database Migrations

```bash
# Run pending migrations
docker compose exec backend alembic upgrade head

# Generate new migration after model changes
docker compose exec backend alembic revision --autogenerate -m "Description of changes"

# Rollback last migration
docker compose exec backend alembic downgrade -1
```

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
```

### Stopping Services

```bash
# Stop all services
docker compose down

# Stop and remove volumes (resets database)
docker compose down -v
```

## Project Structure

```
daggle/
├── backend/                 # FastAPI application
│   ├── src/
│   │   ├── api/             # Routes, schemas, dependencies
│   │   ├── domain/          # Models, services, scoring logic
│   │   └── infrastructure/  # Database, storage, repositories
│   ├── alembic/             # Database migrations
│   └── Dockerfile
├── frontend/                # Angular application
│   ├── src/app/
│   │   ├── core/            # Services, models, interceptors
│   │   ├── layout/          # Header, footer components
│   │   └── pages/           # Route components
│   ├── nginx.conf           # Production nginx config
│   └── Dockerfile
├── tests/                   # Playwright E2E tests
│   └── fixtures/            # Test data files
├── docs/                    # Architecture documentation
├── docker-compose.yml       # Container orchestration
└── playwright.config.js     # Playwright configuration
```

## API Overview

### Authentication
- `POST /auth/register` - Create new account
- `POST /auth/login` - Get access token
- `GET /auth/me` - Get current user

### Competitions
- `GET /competitions/` - List competitions
- `POST /competitions/` - Create competition (sponsor/admin)
- `GET /competitions/{slug}` - Get competition details
- `PATCH /competitions/{slug}` - Update competition
- `POST /competitions/{slug}/thumbnail` - Upload thumbnail

### Submissions
- `POST /competitions/{slug}/submit` - Submit predictions
- `GET /competitions/{slug}/leaderboard` - View leaderboard

See full API documentation at http://localhost:8000/docs

## License

This project is licensed under the PolyForm Internal Use License 1.0.0. You are free to use, modify, and distribute this software for internal business operations and personal use. See [LICENSE](LICENSE) for details.
