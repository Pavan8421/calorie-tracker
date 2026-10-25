# Personal Calorie Tracker

Full-stack app for personal nutrition tracking: log meals, set goals, view reports, extract nutrition from photos, chat with an AI assistant, and bulk-import PDF food diaries.

## Demo

[▶ Play demo](https://drive.google.com/file/d/1p399Md6iHJtKT-IlZzNituzgaSTXv79c/view?usp=sharing)

## Features

- **Auth** — register / login with JWT access tokens and httpOnly refresh cookies
- **Goals & weight** — versioned calorie/macro goals and weight logs
- **Meal diary** — manual entries with macros and micronutrients (no food catalog; each entry is a snapshot)
- **Listing & dashboard** — filter entries by date/meal; daily progress and reports
- **AI photo scan** — upload a label or plate photo; review drafts before saving
- **Chat assistant** — natural-language actions over the same domain services (log meals, goals, summaries)
- **PDF import** — upload a tabular diary PDF, preview rows, confirm into the diary (`source=pdf_import`)

## Stack

| Layer | Tech |
|---|---|
| Backend | FastAPI, SQLAlchemy (async), Alembic, PostgreSQL, Redis, arq |
| AI | OpenAI via LangChain (vision, chat tools, PDF fallback) |
| Frontend | React, Vite, TypeScript, TanStack Query, Tailwind CSS |
| Local / deploy | Docker Compose · [Fly.io](https://ctk-web.fly.dev/) |

## Architecture (short)

```
Browser → frontend (Vite / nginx)
            │  /api/*
            ▼
         FastAPI ──► PostgreSQL
            │
            ├── Redis (rate limits + arq job queue)
            └── worker (arq) ──► PDF parse / LLM fallback
```

- Business rules live in **services**; REST, chat tools, and the PDF worker all call them.
- Design details: [`docs/backend-design.md`](docs/backend-design.md).

## Project layout

```
backend/          FastAPI API, Alembic, arq worker
frontend/         React web app
docs/             Backend design
docker/           Compose helpers (e.g. Postgres init)
docker-compose.yml
```

## Prerequisites

- Docker and Docker Compose
- For hybrid / local API: **Python 3.12+**, **Node.js 20+**
- OpenAI API key for AI scan, chat, and PDF LLM fallback (optional for core diary CRUD)

## Environment variables

### Backend

Copy templates (never commit real secrets):

```bash
cp backend/.env.example backend/.env
# When running the API on the host against Compose Postgres/Redis:
cp backend/.env.example backend/.env.local
```

`.env` is loaded first; **`.env.local` overrides** it (host overrides for `localhost` URLs).

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Async Postgres URL (`postgresql+asyncpg://…`). Compose service host is `postgres:5432`; on the host use `localhost:5433`. |
| `TEST_DATABASE_URL` | Separate DB for pytest |
| `REDIS_URL` | Redis for rate limits and arq (`redis://redis:6379/0` in Compose; `localhost:6379` on the host) |
| `JWT_SECRET` | Required; generate with `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `OPENAI_API_KEY` | Required for AI image, chat, and messy-PDF fallback |
| `OPENAI_VISION_MODEL` / `OPENAI_CHAT_MODEL` | Defaults `gpt-4o` / `gpt-4o-mini` |
| `ENVIRONMENT` | `local` or `production` |
| `CORS_ORIGINS` | Only needed if the frontend is not same-origin via the proxy |

Full list and comments: [`backend/.env.example`](backend/.env.example).

### Frontend

```bash
cp frontend/.env.example frontend/.env
```

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | API prefix in the browser (default `/api/v1`) |
| `DEV_PROXY_TARGET` | Vite proxy target for `/api` (default `http://localhost:8000`) |

## Quick start (full Docker Compose)

Runs Postgres, Redis, API, **PDF worker**, and frontend:

```bash
cp backend/.env.example backend/.env
# Set JWT_SECRET and OPENAI_API_KEY in backend/.env

docker compose up --build
```

| Service | URL |
|---|---|
| App | http://localhost:5173 |
| API docs | http://localhost:8000/docs |
| Health | http://localhost:8000/health |

PDF imports stay `pending` until the **worker** is running (included in this Compose file as `worker`).

## Local hybrid development

Use Compose for infrastructure; run API, worker, and Vite on the host (hot reload).

**1. Infrastructure**

```bash
docker compose up -d postgres redis
# Postgres → localhost:5433   Redis → localhost:6379
```

**2. Backend API**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt

# Point at host-mapped ports (see backend/.env.example comments)
# Typical .env.local:
#   DATABASE_URL=postgresql+asyncpg://calorie:calorie@localhost:5433/calorie_tracker
#   TEST_DATABASE_URL=postgresql+asyncpg://calorie:calorie@localhost:5433/calorie_tracker_test
#   REDIS_URL=redis://localhost:6379/0
#   JWT_SECRET=…   OPENAI_API_KEY=…

alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**3. PDF worker** (required for imports)

In another terminal:

```bash
cd backend
source .venv/bin/activate
arq app.workers.main.WorkerSettings
```

Or: `docker compose up -d worker` (uses the same Redis/Postgres).

**4. Frontend**

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173 (Vite proxies `/api` → backend).

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

Pytest expects Postgres (and the test DB) reachable — typically Compose on port **5433**. Redis is faked in unit/API tests via fakeredis; the real Redis is still needed at runtime for rate limits and enqueueing imports.

## Deployment (Fly.io)

Live app: [https://ctk-web.fly.dev/](https://ctk-web.fly.dev/)

| App | Config | Role |
|---|---|---|
| `ctk-web` | [`frontend/fly.toml`](frontend/fly.toml) | Public site. nginx (`nginx.fly.conf`) serves the SPA and proxies `/api` to the API |
| `ctk-api` | [`backend/fly.toml`](backend/fly.toml) | API (`uvicorn`) and PDF worker (`arq`) in one app. Release command runs `alembic upgrade head` |
| `ctk-redis` | [`redis.fly.toml`](redis.fly.toml) | Redis on the private network |
| `ctk-db` | Fly Postgres | Database. `postgres://` URLs are rewritten to `postgresql+asyncpg://` |

Secrets on `ctk-api`: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `OPENAI_API_KEY`, `ENVIRONMENT=production`. More detail: [design §9](docs/backend-design.md#9-deployment-flyio).

Smoke after deploy: register → log meal → reports → photo scan → chat → PDF import (worker must be up).

## Assumptions and limitations

- Calendar “days” use the user’s timezone.
- Entry nutrition is for the **portion consumed**, not per 100 g.
- AI values are estimates; the user reviews before saving. Images are processed in memory and not stored.
- PDF import expects tabular data (date, food name, calories) or text the LLM fallback can parse; default meal is `snacks`; default date order is **DMY**.
- Chat tools act only as the authenticated user; conversation context is the last ~20 messages.
- Report series are bounded (≤ 92 days); list endpoints are paginated.
- Rate limits are Redis fixed-window (auth, AI scan, chat, PDF upload).


## Documentation

- [Backend design](docs/backend-design.md) — data model, APIs, workers, deployment
