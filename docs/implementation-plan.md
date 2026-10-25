# Personal Calorie Tracker — Implementation Plan

This plan breaks the build into phases. Each phase is a **vertical slice**: one feature implemented end to end (database, backend, frontend, tests), finishing in a working state.

The backend design (tables, endpoints, logic) lives in [backend-design.md](./backend-design.md). This document describes **the order of work**, the frontend design, and what "done" means for each phase.

## Contents

1. [Working Agreement](#1-working-agreement)
2. [Requirements Traceability](#2-requirements-traceability)
3. [Frontend Design](#3-frontend-design)
4. [Local Development Setup](#4-local-development-setup)
5. [Testing Strategy](#5-testing-strategy)
6. [Phases](#6-phases)
   - [Phase 0 — Foundation](#phase-0--foundation)
   - [Phase 1 — Auth & Multi-User](#phase-1--auth--multi-user)
   - [Phase 2 — Goals & Weight](#phase-2--goals--weight)
   - [Phase 3 — Meal Entry](#phase-3--meal-entry)
   - [Phase 4 — Time-Range Listing](#phase-4--time-range-listing)
   - [Phase 5 — Reports & Dashboard](#phase-5--reports--dashboard)
   - [Phase 6 — AI Calorie Extraction](#phase-6--ai-calorie-extraction)
   - [Phase 7 — Conversational Chat](#phase-7--conversational-chat)
   - [Phase 8 — PDF Bulk Import](#phase-8--pdf-bulk-import)
   - [Phase 9 — Hardening, Docs & Deployment](#phase-9--hardening-docs--deployment)
7. [Progress Tracker](#7-progress-tracker)

---

## 1. Working Agreement

- **One phase at a time.** A phase is complete only when its "Done when" checklist passes.
- **Small changes inside a phase.** Backend first (model → migration → schemas → repository → service → endpoint → tests), then frontend (API functions → hooks → components → page).
- **Every phase ends green:** `ruff check`, `ruff format --check`, `pytest`, `npm run lint`, `npm run typecheck`, `npm run build`.
- **One migration per phase** that adds tables (generated with Alembic autogenerate, reviewed by hand).
- **Docs stay in sync.** If implementation deviates from `backend-design.md`, update the design doc in the same commit.
- **Commit at the end of each phase** on `main`, using the suggested commit message (smaller intermediate commits are fine).
- **No secrets in git.** Only `.env.example` is committed.

---

## 2. Requirements Traceability

| Requirement | Phase |
|---|---|
| Goal setting (calories, macros, weight goal) | 2 |
| Meal entry grouped by meal type, with macros and micros | 3 |
| Time-range listing, filterable by date and meal type | 4 |
| Weekly calorie trend chart | 5 |
| Macronutrient breakdown by day / week | 5 |
| Micronutrient summary | 5 |
| Goal vs actual comparison | 5 |
| AI extraction from nutrition label / plate photo | 6 |
| APIs separate from frontend | 0 (architecture), all phases |
| Persistence in a database | 0 (setup), all phases |
| Pagination in all list APIs | 0 (helper), used in 1–8 |
| **Bonus:** Multi-user sign up / log in, private data | 1 |
| **Bonus:** Conversational chat for all app actions | 7 |
| **Bonus:** Bulk import via PDF | 8 |
| README with setup instructions and assumptions | 9 |
| Error handling and input validation | 0 (framework), all phases |
| Deployment | 9 |

---

## 3. Frontend Design

### 3.1 Stack

| Concern | Choice | Why |
|---|---|---|
| Build tool | Vite + React + TypeScript | Fast dev server, typed code |
| Routing | React Router | Standard, supports nested layouts and protected routes |
| Server state | TanStack Query | Caching, loading/error states, invalidation after mutations |
| Forms | react-hook-form + zod | Performant forms, schema validation mirroring the backend rules |
| HTTP | axios | Interceptors for auth header and token refresh |
| UI | Tailwind CSS + shadcn/ui | Accessible components, consistent styling, no heavy UI framework |
| Charts | Recharts | Declarative React charts, covers line/bar/pie |
| Notifications | sonner (via shadcn/ui) | Toasts for success and error messages |
| Dates | date-fns | Small, tree-shakeable date utilities |

### 3.2 Folder structure

```
frontend/
  src/
    main.tsx                    # entry: providers (QueryClient, Router, Auth)
    App.tsx
    api/
      client.ts                 # axios instance, auth header, 401 → refresh → retry
      errors.ts                 # parse backend error envelope into ApiError
      queryClient.ts            # TanStack Query defaults (retry, error toasts)
    providers/
      AuthProvider.tsx          # access token in memory, current user, login/logout
    routes/
      index.tsx                 # route table
      ProtectedRoute.tsx        # redirects to /login when unauthenticated
    features/
      auth/        api.ts  hooks.ts  schemas.ts  types.ts  components/  pages/
      goals/       ...
      entries/     ...
      reports/     ...
      dashboard/   ...
      scan/        ...
      chat/        ...
      imports/     ...
    components/
      ui/                       # shadcn/ui generated components
      layout/                   # AppLayout, Sidebar, Header
      common/                   # Pagination, DateRangePicker, EmptyState,
                                # ErrorState, LoadingState, ConfirmDialog
    lib/
      dates.ts  format.ts  constants.ts  utils.ts
  index.html
  vite.config.ts                # dev proxy: /api → http://localhost:8000
  nginx.conf                    # production: serve SPA, proxy /api → backend
  Dockerfile                    # build with Node, serve with nginx
  .env.example
```

**Convention for each feature folder:**

| File | Contents |
|---|---|
| `api.ts` | Plain functions calling endpoints, typed request/response |
| `hooks.ts` | TanStack Query hooks wrapping `api.ts` (`useEntries`, `useCreateEntry`, ...) |
| `schemas.ts` | zod schemas for forms |
| `types.ts` | TypeScript types matching backend schemas |
| `components/` | Feature-specific components |
| `pages/` | Route-level components |

Components never call axios directly; they use hooks. Hooks never contain UI logic.

### 3.3 Pages

| Route | Page | Phase |
|---|---|---|
| `/login`, `/register` | Auth pages | 1 |
| `/settings` | Profile (name, timezone) | 1 |
| `/goals` | Goal form, goal history, weight log and progress | 2 |
| `/log` | Log meal form (+ "Scan photo" from phase 6) | 3, 6 |
| `/entries` | Filterable, paginated entries list | 4 |
| `/` | Dashboard: today vs goal | 5 |
| `/reports` | Charts | 5 |
| `/chat` | Chat assistant | 7 |
| `/import` | PDF import: upload, preview, confirm | 8 |

### 3.4 Auth handling

- The **access token** is kept **in memory** (React context), never in localStorage, to limit XSS exposure.
- The **refresh token** is an httpOnly cookie set by the backend; JavaScript never reads it.
- **On app load**, `AuthProvider` calls `POST /auth/refresh` to restore the session silently. While this runs, a full-page loader is shown.
- **axios interceptor:** on a `401`, it triggers one refresh (shared across concurrent requests), then retries the original request. If refresh fails, the user is logged out and redirected to `/login`.

### 3.5 Error handling

- `api/errors.ts` converts every failed response into an `ApiError { status, code, message, details }`.
- **Form errors:** `422` responses with `details` are mapped onto the matching form fields (`setError`).
- **Other errors:** shown as toasts with the backend `message`.
- **Network errors / 5xx:** a generic "Something went wrong, please try again" toast.
- **Page-level failures:** `ErrorState` component with a retry button; a top-level React error boundary catches render errors.
- Every data view has explicit **loading**, **empty**, and **error** states.

### 3.6 Data freshness

Mutations invalidate the affected queries. For example, creating an entry invalidates `entries`, `reports`, and `dashboard` queries, so charts update immediately after logging a meal.

---

## 4. Local Development Setup

**Two ways to run locally:**

| Mode | Command | Use |
|---|---|---|
| Full stack in Docker | `docker compose up --build` | Production-like: nginx serves the frontend and proxies `/api` |
| Hybrid (hot reload) | `docker compose up postgres redis backend worker` + `npm run dev` in `frontend/` | Day-to-day frontend work; Vite proxies `/api` to the backend |

Both modes are **same-origin** (nginx proxy or Vite proxy), matching production, so cookies and auth behave identically everywhere.

**docker-compose.yml services:** `postgres`, `redis`, `backend`, `worker` (from phase 8), `frontend`.

**Backend tooling:** `pip` + a virtual environment in `backend/.venv` (Python 3.12).

| File | Contents |
|---|---|
| `requirements.txt` | Runtime dependencies, exact pinned versions (used by the Docker image) |
| `requirements-dev.txt` | `-r requirements.txt` plus test and lint tools (pytest, pytest-asyncio, fakeredis, pytest-cov, ruff) |
| `pyproject.toml` | Project metadata and tool settings only (ruff, pytest); no dependency management |

**Backend setup on the host:**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements-dev.txt
```

**Everyday backend commands** (with the virtual environment activated):

```bash
uvicorn app.main:app --reload     # run the API (uses .env + .env.local)
pytest                            # run tests
ruff check . && ruff format --check .
alembic upgrade head              # apply migrations
```

**Adding a dependency:** `pip install package-name`, then add it with its exact version (`pip show package-name`) to `requirements.txt` or `requirements-dev.txt`. Avoid `pip freeze > requirements.txt`, which mixes runtime and dev packages.

**Environment files:** `backend/.env` (Docker Compose hostnames) and `backend/.env.local` (localhost overrides for running on the host), `frontend/.env` and `frontend/.env.local`. Only the `.env.example` templates are committed.

**Root-level files created in phase 0:** `docker-compose.yml`, `README.md` (skeleton). Already created: `.gitignore`, `.env` / `.env.local` / `.env.example` in `backend/` and `frontend/`.

---

## 5. Testing Strategy

**Backend (written in every phase):**

| Layer | Approach |
|---|---|
| API tests (`tests/api/`) | httpx `AsyncClient` against the FastAPI app, real PostgreSQL test database |
| Unit tests (`tests/unit/`) | Pure logic: date helpers, nutrient validation, goal resolution, PDF column mapping, image preprocessing |
| Database isolation | Each test runs inside a transaction that is rolled back afterwards |
| LLM (LangChain) | Shared chat-model factory overridden with a fake returning scripted structured outputs / tool calls — no network calls in tests |
| Redis | `fakeredis` for rate-limit tests |
| arq worker | Task functions are called directly in tests (no running worker needed) |

**Shared fixtures (`tests/conftest.py`):** test database setup, `client`, `user_factory`, `auth_headers` (a logged-in user), `other_user` (for isolation tests).

**Isolation tests are mandatory** for every resource: user B must get `404` when accessing user A's data.

**Frontend:** no automated tests; quality is enforced with TypeScript strict mode, ESLint, and a successful production build.

---

## 6. Phases

### Phase 0 — Foundation

**Goal:** both apps run, talk to each other through the proxy, and share the error/pagination conventions. No features yet.

**Backend**

| Task | Files |
|---|---|
| Virtual environment (`python3 -m venv .venv`); not committed | `backend/.venv/` |
| Pinned runtime and dev dependencies | `requirements.txt`, `requirements-dev.txt` |
| Project metadata, ruff and pytest settings | `pyproject.toml` |
| Settings from env vars, DB URL scheme fix | `core/config.py` |
| Structured logging + request id middleware | `core/logging.py` |
| `AppError` hierarchy + exception handlers (incl. validation reshaping) | `core/errors.py` |
| Async engine, session dependency | `db/session.py` |
| Declarative base with `id`, `created_at`, `updated_at` | `db/base.py` |
| Redis connection pool | `core/redis.py` |
| `Page[T]`, `PaginationParams`, `ErrorResponse` | `schemas/common.py` |
| Generic `paginate()` helper | `repositories/base.py` |
| `get_db`, pagination dependency | `api/deps.py` |
| `GET /health` (Postgres + Redis) | `api/health.py` |
| App factory, middleware, handlers, router mounting | `main.py`, `api/v1/router.py` |
| Async Alembic environment | `alembic.ini`, `alembic/env.py` |
| Image: Python 3.12, `pip install -r requirements.txt`, run uvicorn on `::` | `Dockerfile` |
| Keep `.venv`, `.env*` (except `.env.example`), caches, and tests out of the image | `.dockerignore` |

**Frontend**

| Task | Files |
|---|---|
| Vite + React + TS scaffold, strict TS, `@/` path alias | `vite.config.ts`, `tsconfig.json` |
| Tailwind + shadcn/ui init; base components (button, input, card, dialog, table, select, toast) | `components/ui/` |
| ESLint + Prettier, `typecheck` script | `package.json` |
| axios client + error parsing | `api/client.ts`, `api/errors.ts` |
| Query client with defaults | `api/queryClient.ts` |
| App layout (sidebar nav, header), placeholder pages, 404 page, error boundary | `components/layout/`, `routes/index.tsx` |
| Shared states: loading, empty, error | `components/common/` |
| Dev proxy `/api` and `/health` → backend | `vite.config.ts` |
| Production image: Node build → nginx; SPA fallback; `/api` proxy | `Dockerfile`, `nginx.conf` |

**Root:** `docker-compose.yml`, `README.md` skeleton.

**Tests**
- `GET /health` returns 200 with database and redis "ok".
- Error envelope: a validation error returns `{"error": {"code": "VALIDATION_ERROR", ...}}`.
- Unhandled exception returns `500 INTERNAL_ERROR` without leaking details.
- `paginate()` returns correct `total`, `total_pages`, and slices.

**Done when**
- [ ] `pip install -r requirements-dev.txt` succeeds in a fresh `backend/.venv`.
- [ ] `docker compose up --build` starts postgres, redis, backend, frontend.
- [ ] `http://localhost:8000/health` returns ok; `http://localhost:8000/docs` shows OpenAPI.
- [ ] Frontend loads the layout with placeholder pages; `/api` requests reach the backend through the proxy.
- [ ] `alembic upgrade head` runs (empty migration history).
- [ ] All lint, typecheck, test, and build commands pass.

**Commit:** `chore: project foundation (FastAPI, Vite, Docker Compose, errors, pagination)`

---

### Phase 1 — Auth & Multi-User

**Goal:** users can register, log in, stay logged in across reloads, and log out. Every later feature is user-scoped.

**Backend**

| Task | Files |
|---|---|
| `users`, `refresh_tokens` models + migration | `models/user.py`, `models/refresh_token.py` |
| Password hashing, JWT create/verify, refresh token generation + hashing | `core/security.py` |
| Register / login / profile schemas (password policy, timezone validation) | `schemas/auth.py`, `schemas/user.py` |
| User and token repositories | `repositories/user_repo.py`, `repositories/token_repo.py` |
| Register, login, refresh (rotation + reuse detection), logout | `services/auth_service.py` |
| Get / update profile | `services/user_service.py` |
| `get_current_user` dependency | `api/deps.py` |
| Fixed-window rate limiter dependency (fail-open) | `core/rate_limit.py` |
| Endpoints: `/auth/*`, `/users/me` | `endpoints/auth.py`, `endpoints/users.py` |

**Frontend**

| Task | Files |
|---|---|
| Login and register pages with zod validation; timezone defaults to the browser's (`Intl`) | `features/auth/pages/` |
| `AuthProvider`: in-memory token, silent refresh on load, login/logout | `providers/AuthProvider.tsx` |
| Protected routes + redirect after login | `routes/ProtectedRoute.tsx` |
| axios 401 → single refresh → retry | `api/client.ts` |
| Settings page: name, timezone | `features/auth/pages/SettingsPage.tsx` |
| User menu with logout in header | `components/layout/` |

**Tests**
- Register: success; duplicate email `409`; weak password / invalid timezone `422`; email stored lowercased.
- Login: success sets refresh cookie; wrong email and wrong password return the same `401`.
- Refresh: rotates the token; old token no longer works; reusing a revoked token revokes all user tokens.
- Logout revokes the token and clears the cookie.
- Protected endpoint without / with expired token returns `401`.
- `PATCH /users/me` updates timezone; invalid timezone `422`.
- Login rate limit returns `429` with `Retry-After`.

**Done when**
- [x] A user can register, log in, reload the page and stay logged in, then log out.
- [x] Unauthenticated users are redirected to `/login`.
- [x] Two users in two browsers have independent sessions.
- [x] All checks pass.

**Commit:** `feat(auth): registration, login, token refresh, and protected routes`

---

### Phase 2 — Goals & Weight

**Goal:** users set versioned nutrition goals and a weight goal, log weight, and see progress.

**Backend** *(done)*

| Task | Files |
|---|---|
| `goals`, `weight_logs` models + migration | `models/goal.py`, `models/weight_log.py` |
| Timezone helpers: `to_local_date`, `today_for` | `core/time.py` |
| Goal and weight schemas (ranges, future target date, warnings in response) | `schemas/goal.py`, `schemas/weight_log.py` |
| Repositories (current goal query, range lookup, weight upsert) | `repositories/goal_repo.py`, `repositories/weight_log_repo.py` |
| Versioning (same-day upsert), current goal, `get_goals_for_range`, macro consistency warning, weight progress | `services/goal_service.py`, `services/weight_log_service.py` |
| Endpoints: `/goals/*`, `/weight-logs/*` | `endpoints/goals.py`, `endpoints/weight_logs.py` |

**Frontend**

| Task | Files |
|---|---|
| Goals page: goal form (calories, macros, fiber, target weight/date), warning display | `features/goals/` |
| Goal history table (paginated) | `features/goals/components/` |
| Weight log form + paginated history | `features/goals/components/` |
| Weight progress card (start → current → target) | `features/goals/components/` |
| Shared `Pagination` component | `components/common/Pagination.tsx` |
| "Set your goals" prompt when `GOAL_NOT_SET` | `features/goals/components/` |

**Tests**
- `effective_from` defaults to today **in the user's timezone**.
- Two goal changes on the same day produce one version.
- Current goal ignores future-dated versions; no goal returns `404 GOAL_NOT_SET`.
- Macro mismatch over 15% returns a warning, not an error.
- Validation: out-of-range calories, past target date → `422`.
- `get_goals_for_range` maps each day to the right version (unit test).
- Weight log: same-day upsert; progress percentage and clamping.
- Isolation: other user's goal / weight log → `404`.

**Done when**
- [x] A user sets goals, edits them, and sees history.
- [x] A user logs weight and sees progress toward the target.
- [x] All checks pass.

**Commit:** `feat(goals): versioned nutrition goals, weight logs, and progress`

---

### Phase 3 — Meal Entry

**Goal:** users log food entries with macros and micronutrients, edit and delete them, and re-log recent foods quickly.

**Backend**

| Task | Files |
|---|---|
| Nutrient registry | `nutrients.py` |
| `GET /nutrients` | `endpoints/meta.py` |
| `food_entries` model, `meal_type` and `entry_source` enums, indexes + migration (`import_job_id` is added in phase 8) | `models/food_entry.py` |
| Entry schemas: field rules, micronutrient key/value validation against the registry, client-allowed sources | `schemas/entry.py` |
| Repository: create, get, update, delete, recent foods (`DISTINCT ON`) | `repositories/entry_repo.py` |
| Service: compute `consumed_on`, enforce source rules, recompute on update | `services/entry_service.py` |
| Endpoints: `POST/GET/PATCH/DELETE /entries`, `GET /entries/recent` | `endpoints/entries.py` |

**Frontend**

| Task | Files |
|---|---|
| `useNutrients` hook (long cache time) | `features/entries/hooks.ts` |
| Entry form: meal type, food name, quantity + unit, date/time, calories, macros | `features/entries/components/EntryForm.tsx` |
| Micronutrient fields: add nutrient from registry list, value with unit label | `features/entries/components/MicronutrientFields.tsx` |
| Recent foods autocomplete that pre-fills the form | `features/entries/components/RecentFoodsPicker.tsx` |
| Log meal page | `features/entries/pages/LogMealPage.tsx` |
| Edit dialog and delete confirmation (reused in phase 4) | `features/entries/components/` |

**Tests**
- Create: success; `consumed_on` correct for the user's timezone (e.g. 23:30 IST stays on the same local date).
- Future `consumed_at`, non-positive quantity, negative macros → `422`.
- Unknown micronutrient key → `422` naming the key; negative micronutrient value → `422`.
- Client cannot set `source=chat` or `source=pdf_import`.
- Update recomputes `consumed_on` when `consumed_at` changes.
- Delete returns `204`; subsequent get returns `404`.
- Recent foods returns one row per food name (case-insensitive), newest first, paginated.
- Isolation for get/update/delete.

**Done when**
- [x] A user logs a meal with macros and micronutrients, edits it, and deletes it.
- [x] Recent foods pre-fill the form.
- [x] All checks pass.

**Commit:** `feat(entries): meal entry CRUD with nutrient registry and recent foods`

---

### Phase 4 — Time-Range Listing

**Goal:** users browse their entries by date range and meal type, with pagination.

**Backend** *(done)*

| Task | Files |
|---|---|
| Filter schema: `start_date`, `end_date` (defaults: last 7 days), repeatable `meal_type`, range validation | `schemas/entry.py` |
| Filtered, ordered, paginated query | `repositories/entry_repo.py` |
| `GET /entries` | `services/entry_service.py`, `endpoints/entries.py` |

**Frontend** *(done)*

| Task | Files |
|---|---|
| Entries page with filters stored in URL search params (shareable, back-button friendly) | `features/entries/pages/EntriesPage.tsx` |
| Date range picker with presets (today, 7 days, 30 days, custom) | `components/common/DateRangePicker.tsx` |
| Meal type multi-select filter | `features/entries/components/MealTypeFilter.tsx` |
| Entries table: date, meal, food, quantity, calories, macros, source badge; row edit/delete | `features/entries/components/EntriesTable.tsx` |
| Pagination + empty state ("No entries in this range") | `components/common/` |

**Tests**
- Date range filter includes boundaries; entries outside are excluded.
- Single and multiple `meal_type` filters.
- `start_date` after `end_date` → `422 INVALID_DATE_RANGE`; range over 366 days → `422`.
- Pagination metadata (`total`, `total_pages`) and stable ordering across pages.
- Timezone boundary: entry near midnight appears on the correct local date.
- Isolation: only the current user's entries are listed.

**Done when**
- [x] A user filters entries by date range and meal type and pages through results.
- [x] Filters survive page reload (URL params).
- [x] All checks pass.

**Commit:** `feat(entries): time-range listing with meal type filters and pagination`

---

### Phase 5 — Reports & Dashboard

**Goal:** users see today's progress on a dashboard and trend charts on a reports page.

**Backend** *(done)*

| Task | Files |
|---|---|
| Aggregation queries: daily totals by meal, zero-filled calorie series, macros by day/week, micronutrient totals, per-day actuals | `repositories/report_repo.py` |
| Report logic: goal mapping per day, macro percentages, micronutrient averages / % DV / status, adherence | `services/report_service.py` |
| Report response schemas | `schemas/report.py` |
| Endpoints: daily summary, calorie trend, macros, micronutrients, goal comparison; 92-day limit | `endpoints/reports.py` |

**Frontend**

| Task | Files |
|---|---|
| Dashboard: calorie progress vs goal, macro progress bars, today's meals grouped by meal type, quick link to log | `features/dashboard/` |
| Reports page with range presets (7 / 30 / 90 days, custom) | `features/reports/pages/ReportsPage.tsx` |
| Calorie trend: bar chart per day with goal line | `features/reports/components/CalorieTrendChart.tsx` |
| Macro breakdown: stacked bars with day/week toggle + calorie-share pie | `features/reports/components/MacroBreakdownChart.tsx` |
| Micronutrient summary: % daily value bars with low/adequate/high colouring | `features/reports/components/MicronutrientSummary.tsx` |
| Goal vs actual: grouped bars (actual vs goal) + adherence summary | `features/reports/components/GoalComparisonChart.tsx` |
| Query invalidation: entry mutations refresh dashboard and reports | `features/entries/hooks.ts` |

**Tests**
- Calorie trend returns one point per day, with zeros for days without entries.
- Weekly grouping uses Monday-start weeks.
- Macro percentages computed correctly.
- Micronutrient daily average, % DV, and status thresholds.
- Goal comparison uses the goal in effect on each day when goals change mid-range; days without a goal excluded from adherence.
- Range over 92 days or invalid `group_by` → `422`.
- Isolation: reports include only the current user's entries.

**Done when**
- [x] Dashboard shows today's totals vs goal and updates immediately after logging a meal.
- [x] All four report charts render with real data and handle empty ranges gracefully.
- [x] All checks pass.

**Commit:** `feat(reports): dashboard and nutrition reports with charts`

---

### Phase 6 — AI Calorie Extraction

**Goal:** users upload a nutrition label or plate photo and get a pre-filled, editable entry.

**Backend** *(done)*

| Task | Files |
|---|---|
| Shared LangChain chat-model factory: timeouts, one retry, error mapping; injectable so tests can override it; add `langchain` / `langchain-openai` deps | `integrations/llm.py`, `requirements.txt` |
| Vision prompts per hint + `with_structured_output(ImageAnalysis)` | `integrations/vision.py` |
| Response and draft schemas (Pydantic) | `schemas/ai.py` |
| Service: file validation (size, Pillow sniffing), preprocessing (EXIF orientation + strip, resize, re-encode), LangChain call, post-processing (drop unknown keys, clamp, calorie sanity note), `not_food` handling | `services/ai_service.py` |
| `POST /ai/analyze-image` with rate limit (20/hour) | `endpoints/ai.py` |

**Frontend**

| Task | Files |
|---|---|
| Scan dialog: drag-and-drop / file picker (no camera capture), hint selector (auto, label, plate), image preview | `features/scan/components/ScanPhotoDialog.tsx` |
| Loading state during analysis (5–15 s) | `features/scan/components/` |
| Draft review: one card per detected item, confidence badge, model notes, "Use this" pre-fills `EntryForm` | `features/scan/components/DraftReview.tsx` |
| Save with `source=ai_image` | `features/entries/` |
| "Scan photo" button on the log meal page | `features/entries/pages/LogMealPage.tsx` |

**Tests** (LLM faked via LangChain factory override)
- Label image returns one draft with the label values.
- Plate image returns multiple drafts.
- `not_food` → `422 NOT_FOOD_IMAGE`.
- Unknown micronutrient keys dropped; negative values clamped.
- Non-image or corrupt file → `415`; file over 5 MB → `413`.
- LLM timeout → `504`; LLM unavailable → `503`.
- Rate limit → `429`.
- Preprocessing unit test: output is resized and has no EXIF data.

**Done when**
- [x] Uploading a real nutrition label photo pre-fills the form with sensible values.
- [x] Uploading a plate photo produces editable drafts per item.
- [x] Errors (wrong file, not food, AI failure) show clear messages.
- [x] All checks pass.

**Commit:** `feat(ai): LangChain vision extraction with editable drafts`

---

### Phase 7 — Conversational Chat

**Goal:** users perform every app action through natural language.

**Backend**

| Task | Files |
|---|---|
| `chat_conversations`, `chat_messages` models + `chat_role` enum + migration | `models/chat.py` |
| Chat repository (conversations, paginated messages, last-N context) | `repositories/chat_repo.py` |
| LangChain tools: Pydantic args; handlers calling existing services; `delete_entry` requires `confirmed=true` | `chat/tools.py` |
| System prompt with today's date, timezone, rules | `chat/prompts.py` |
| LangChain tool-calling agent: max 5 iterations, tool errors returned to the model, `user_id` from auth context, collected `actions` | `chat/agent.py` |
| Persistence, conversation titles | `services/chat_service.py` |
| Chat schemas and endpoints; rate limit (30/minute) | `schemas/chat.py`, `endpoints/chat.py` |

**Frontend**

| Task | Files |
|---|---|
| Chat page: conversation list sidebar, message list, input | `features/chat/` |
| Action chips under assistant messages (e.g. "Logged Oatmeal · 350 kcal") | `features/chat/components/ActionChips.tsx` |
| Typing indicator while waiting; suggested prompts for empty conversations | `features/chat/components/` |
| Invalidate entries / goals / reports queries based on returned `actions` | `features/chat/hooks.ts` |

**Tests** (LLM faked with scripted tool calls)
- Every tool's schema is generated from its Pydantic model.
- "Log 2 eggs for breakfast" → `log_meal` called → entry created with `source=chat` → action returned.
- Tool argument validation error is returned to the model, and the request still succeeds.
- Loop stops after 5 iterations.
- `delete_entry` without confirmation does not delete.
- Tools cannot access another user's data even if the model passes another user's entry id.
- Conversations and messages are user-scoped and paginated.

**Done when**
- [ ] Through chat alone, a user can log a meal, check goals, set goals, log weight, ask a nutrition question, and get a weekly summary.
- [ ] Actions taken in chat appear immediately in the dashboard and entries list.
- [ ] All checks pass.

**Commit:** `feat(chat): LangChain tool-calling assistant over existing services`

---

### Phase 8 — PDF Bulk Import

**Goal:** users upload a tabular food diary PDF, review parsed rows, and import them.

**Backend**

| Task | Files |
|---|---|
| `import_jobs` model + `import_status` enum + migration; adds `food_entries.import_job_id` FK | `models/import_job.py`, `models/food_entry.py` |
| arq pool created in app lifespan; worker settings | `core/redis.py`, `workers/main.py` |
| Table extraction, header normalisation, synonym mapping, multi-page header carry-over, meal inference | `integrations/pdf_parser.py` |
| LLM fallback for unparseable PDFs (LangChain structured output via shared `llm.py`) | `integrations/pdf_llm_fallback.py` |
| Job task: status transitions, row validation with `FoodEntryCreate`, clear `file_data`, failure handling | `workers/import_tasks.py` |
| Service: upload validation, job creation, enqueue, confirm in one transaction, duplicate skip | `services/import_service.py` |
| Repository, schemas, endpoints; rate limit (10/hour) | `repositories/import_repo.py`, `schemas/imports.py`, `endpoints/imports.py` |
| `worker` service in Docker Compose | `docker-compose.yml` |
| Sample PDFs for tests and demo | `backend/tests/fixtures/`, `docs/samples/` |

**Frontend**

| Task | Files |
|---|---|
| Upload form: file picker, date format (DMY / MDY) | `features/imports/components/ImportUpload.tsx` |
| Status polling (`refetchInterval` until `preview_ready` / `failed`) | `features/imports/hooks.ts` |
| Preview table: checkbox per valid row, invalid rows shown with error messages | `features/imports/components/ImportPreviewTable.tsx` |
| Confirm → success summary with link to the entries list for the imported range | `features/imports/` |
| Import history (paginated) | `features/imports/components/ImportHistory.tsx` |

**Tests**
- Parser: standard table; headers with units ("Protein (g)"); synonyms ("Kcal", "Item"); table spanning pages; meal from section headings; default `snacks`.
- Date parsing honours `DMY` vs `MDY`.
- Rows failing validation are marked invalid with error messages.
- Upload: non-PDF → `415`; too large / too many pages → `422`.
- Task: success → `preview_ready`; exception → `failed` with message; `file_data` cleared.
- Confirm: inserts selected rows only, all in one transaction; second confirm → `409`; duplicates skipped when requested.
- Isolation: other user's import → `404`.

**Done when**
- [ ] Uploading the sample PDF shows a preview within seconds; confirming imports the rows.
- [ ] Imported entries appear in listing and reports with a "PDF" source badge.
- [ ] All checks pass.

**Commit:** `feat(imports): PDF food diary import with background parsing and preview`

---

### Phase 9 — Hardening, Docs & Deployment

**Goal:** the project is polished, documented, and live on Railway.

**Hardening**
- Review every endpoint for validation gaps and consistent error codes.
- Fill test coverage gaps; run the full suite.
- Frontend polish: loading/empty/error states everywhere, responsive layout on mobile, accessible labels, consistent number formatting.
- Demo seed script creating a demo user with two weeks of entries and goals (`backend/scripts/seed.py`).

**README.md**
- Overview and feature list (with screenshots).
- Architecture summary and links to `docs/`.
- Prerequisites, environment variables, local setup (both modes), running tests and linters.
- Deployment instructions.
- Assumptions and known limitations.

**Deployment (Railway)**
- [ ] Create project; add Postgres and Redis.
- [ ] `backend` service: root `backend/`, Dockerfile, `PORT=8000`, start `uvicorn ... --host :: --port $PORT`, pre-deploy `alembic upgrade head`, health check `/health`.
- [ ] `worker` service: root `backend/`, start `arq app.workers.main.WorkerSettings`, no public domain.
- [ ] `frontend` service: root `frontend/`, nginx proxying `/api` to `backend.railway.internal:8000` (with `resolver` set).
- [ ] Shared variables: `DATABASE_URL`, `REDIS_URL` (references), `JWT_SECRET`, `OPENAI_API_KEY`, `ENVIRONMENT=production`.
- [ ] `railway.json` per service committed.
- [ ] Smoke test on the live URL: register, log meal, reports, scan photo, chat, PDF import.

**Done when**
- [ ] Live URL works end to end for a new user.
- [ ] A reviewer can clone the repo and run it locally with only the README.
- [ ] All checks pass.

**Commit:** `docs: README and deployment; chore: final polish`

---

## 7. Progress Tracker

| Phase | Status |
|---|---|
| 0 — Foundation | Done |
| 1 — Auth & Multi-User | Done |
| 2 — Goals & Weight | Done |
| 3 — Meal Entry | Done |
| 4 — Time-Range Listing | Done |
| 5 — Reports & Dashboard | Done |
| 6 — AI Calorie Extraction | Done |
| 7 — Conversational Chat | Not started |
| 8 — PDF Bulk Import | Not started |
| 9 — Hardening, Docs & Deployment | Not started |
