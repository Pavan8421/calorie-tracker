# Personal Calorie Tracker

Full-stack app for logging meals, setting nutrition goals, viewing reports, extracting nutrition from photos, chatting with an AI assistant, and importing PDF food diaries.

## Stack

- **Backend:** FastAPI, SQLAlchemy (async), PostgreSQL, Redis, Alembic
- **Frontend:** React, Vite, TypeScript, TanStack Query, Tailwind CSS
- **Deploy:** Docker Compose locally, Railway in production

## Project layout

```
backend/     FastAPI API
frontend/    React web app
docs/        Design and implementation plans
docker/      Supporting Docker assets
```

## Prerequisites

- Python 3.12+
- Node.js 20+
- Docker and Docker Compose

## Quick start (Docker)

```bash
cp backend/.env.example backend/.env   # if needed
# Set JWT_SECRET and optionally OPENAI_API_KEY in backend/.env
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

## Local hybrid development

```bash
# Infrastructure (Postgres is published on host port 5433)
docker compose up postgres redis

# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Tests and checks

```bash
# Backend
cd backend && source .venv/bin/activate
ruff check .
ruff format --check .
pytest

# Frontend
cd frontend
npm run lint
npm run typecheck
npm run build
```

## Documentation

- [Backend design](docs/backend-design.md)
- [Implementation plan](docs/implementation-plan.md)

## Status

Phase 0 (foundation) is complete. Feature work starts in Phase 1 (auth).
