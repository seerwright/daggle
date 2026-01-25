# Daggle

An internal platform for hosting data science competitions. Teams can compete on machine learning challenges, submit predictions, and track their performance on leaderboards.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.11+, FastAPI, SQLAlchemy 2.0 |
| Frontend | Angular 18, Angular Material |
| Database | PostgreSQL 16 |
| Infrastructure | Docker, Docker Compose |

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Git

### Running Locally

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd daggle
   ```

2. Start all services:
   ```bash
   docker-compose up --build
   ```

3. Access the application:
   - Frontend: http://localhost:4200
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### First-Time Setup

On first run, the database migrations run automatically. To create a test user:

```bash
# Register via API
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","username":"yourname","password":"password123","display_name":"Your Name"}'
```

## Project Structure

```
daggle/
├── backend/           # FastAPI application
│   ├── src/
│   │   ├── api/       # Routes and schemas
│   │   ├── domain/    # Models, services, scoring
│   │   └── infrastructure/  # Repositories, database
│   ├── alembic/       # Database migrations
│   └── data/          # Competition data files
├── frontend/          # Angular application
│   └── src/app/
│       ├── core/      # Services and models
│       ├── layout/    # Header, footer
│       └── pages/     # Route components
├── docs/              # Architecture and planning docs
└── docker-compose.yml
```

## Documentation

See the `/docs` directory for detailed documentation:

- `implementation-plan.md` - Technical architecture and milestone planning
- `architecture-proposal.md` - System design and decisions

## Development

### Backend

```bash
# Run migrations
docker exec daggle-backend-1 alembic upgrade head

# Generate new migration
docker exec daggle-backend-1 alembic revision --autogenerate -m "Description"
```

### Frontend

For hot-reload during development:

```bash
docker-compose --profile dev up frontend-dev
```

## License

Internal use only.
