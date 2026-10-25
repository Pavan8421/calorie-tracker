# Calorie Tracker — UI Redesign Implementation Plan

This plan ports the visual redesign in [`docs/samples/Calorie Tracker UI Refresh.html`](./samples/Calorie%20Tracker%20UI%20Refresh.html) onto the existing React frontend **screen by screen**.

It is **frontend-only**. APIs, auth, and data models stay as they are. The mock redesigns presentation and layout; it does not add new product capabilities.

The original feature build order lives in [`implementation-plan.md`](./implementation-plan.md). This document covers **visual and UX alignment** with the sample.

## Contents

1. [Working agreement](#1-working-agreement)
2. [Source of truth](#2-source-of-truth)
3. [Current → target map](#3-current--target-map)
4. [Design system](#4-design-system)
5. [Out of scope](#5-out-of-scope)
6. [Phases](#6-phases)
7. [Progress tracker](#7-progress-tracker)
8. [Verification](#8-verification)

---

## 1. Working agreement

- **One screen (phase) at a time.** Finish and visually check a phase before starting the next.
- **Foundation first.** Phase 0 (tokens + shell primitives) unlocks every later screen.
- **Match the mock’s hierarchy**, not every pixel. Prefer the sample’s layout, copy tone, and component shapes; keep existing behavior, loading/error/empty states, and form validation.
- **No backend changes** unless a gap blocks the mock and is agreed separately.
- **Reuse feature hooks/APIs.** Restyle pages and components; do not rewrite data layers.
- **Mobile is required.** The sample is desktop (~1440×900+). Each phase must remain usable on narrow viewports (collapse sidebar, stack grids).
- **Done when** the phase checklist passes and `npm run lint`, `npm run typecheck` are clean.
- **Reference while building:** open the sample HTML and compare the matching board (Sign in, Today, etc.).

Suggested commit cadence: one commit per completed phase (or smaller intermediate commits if useful).

---

## 2. Source of truth

| Artifact | Role |
|---|---|
| `docs/samples/Calorie Tracker UI Refresh.html` | Visual target (bundled boards for every screen + shared sidebar) |
| Existing `frontend/` feature pages | Behavior and data wiring to preserve |
| This plan | Order of work and “done when” criteria |

### Sample boards (in file order)

1. Sign in  
2. Create account  
3. Settings  
4. Today  
5. Log meal  
6. Entries  
7. Reports  
8. Goals  
9. Chat  
10. Import  
11. Shared sidebar  

Implementation order below differs slightly: **shell + design tokens before auth and Today**, so later screens inherit the chrome.

---

## 3. Current → target map

| Sample board | Route | Primary files today | Main visual change |
|---|---|---|---|
| Shared sidebar | (layout) | `components/layout/AppLayout.tsx`, `UserMenu.tsx` | Icon nav, ring logo, bottom user → Settings / Log out; remove top header strip |
| Sign in | `/login` | `features/auth/pages/LoginPage.tsx` | Split layout: teal brand panel + form |
| Create account | `/register` | `features/auth/pages/RegisterPage.tsx` | Split layout + onboarding steps + password hints |
| Today | `/` | `features/dashboard/pages/DashboardPage.tsx`, `ProgressBar.tsx`, `TodayMeals.tsx` | Calorie ring hero, 7/5 grid, meal list + 7-day mini chart |
| Log meal | `/log` | `features/entries/pages/LogMealPage.tsx`, `EntryForm.tsx`, scan/recent components | Two-column form + scan/chat shortcuts + live kcal feedback |
| Entries | `/entries` | `features/entries/pages/EntriesPage.tsx`, `EntriesTable.tsx`, filters | Day-grouped table, range chips, denser toolbar |
| Reports | `/reports` | `features/reports/pages/ReportsPage.tsx`, chart components | Stats strip, restyled charts, clearer sections |
| Goals | `/goals` | `features/goals/pages/GoalsPage.tsx` + goal/weight components | Goal + weight cards, history tables restyled |
| Chat | `/chat` | `features/chat/pages/ChatPage.tsx` + chat components | 280px thread list + conversation chrome |
| Import | `/import` | `features/imports/pages/ImportPage.tsx` + import components | Explicit Upload → Review → Import steps |
| Settings | `/settings` | `features/auth/pages/SettingsPage.tsx` | Profile card layout aligned with shell |

Nav label change in the mock: **Dashboard → Today** (route stays `/`).

---

## 4. Design system

Lock these in Phase 0 and reuse everywhere. Values come from the sample.

### 4.1 Tokens

| Token | Value | Use |
|---|---|---|
| Background | `#F7F4EF` | App canvas |
| Foreground | `#1C1917` | Primary text |
| Muted surface | `#F0EBE3` / `#FAF8F4` | Soft panels, input fills |
| Muted text | `#6B635C` / `#44403C` | Secondary copy |
| Card / surface | `#FFFFFF` | Elevated panels |
| Border | `#E7E0D5` / `#D9D0C2` | Dividers, inputs |
| Primary | `#0F766E` | Buttons, active accents |
| Primary deep | `#134E4A` | Brand panels, strong fills |
| Primary soft | `#DCEFEB` | Active nav, soft chips |
| Primary ink | `#134E4A` / `#115E59` | Active nav text |
| Ring track | `#EDE6DA` | Progress ring background |
| Accent gold | `#E3A828` | Chart / meal segments |
| Accent purple | `#8A68B4` | Chart / meal segments |
| Accent teal light | `#5EB8AC` / `#A9DCD4` | Chart segments |

Update `frontend/src/index.css` `@theme` so Tailwind utilities (`bg-background`, `text-primary`, etc.) match the sample. Prefer tokens over one-off hex in page code.

### 4.2 Typography

- Family: **Figtree** (400 / 500 / 600 / 700 / 800), fallback `system-ui, sans-serif`
- Add via Google Fonts link in `index.html` or a font package
- Use `font-variant-numeric: tabular-nums` on data-heavy pages (Today, Entries, Reports, Goals)
- Hierarchy from the mock: large display numbers (e.g. ring “1,600”), bold page titles, quieter supporting lines

### 4.3 Shared chrome (authenticated pages)

- Full-height cream background (not a centered `max-w-7xl` “dashboard card” shell)
- Fixed/sticky **sidebar ~248px** with:
  - Ring logo + **Calorie Tracker** wordmark
  - Icon + label nav (Today, Log meal, Entries, Reports, Goals, Chat, Import)
  - Active state: soft teal pill (`#DCEFEB`), weight 700
  - Footer: avatar initials → Settings, Log out
- Main column: padding ~`32px 40px`, content `max-width ~1192px`
- **Remove** the current top header strip (“Track meals, goals…”) and relocate account actions into the sidebar footer (replace or slim `UserMenu`)

### 4.4 Shared UI primitives to add/adjust

Prefer extending existing `components/ui/*` and small new layout/common pieces:

| Primitive | Purpose |
|---|---|
| `BrandMark` / ring logo SVG | Sidebar + auth panels |
| `AppSidebar` | Extracted from `AppLayout` |
| Page header pattern | Title + one supporting sentence + optional primary CTA |
| Soft panel / surface | White or `#FAF8F4` rounded ~16–20px regions (mock uses panels more than heavy card chrome) |
| Filter chips | Today / 7 days / 30 days style toggles (Entries, Reports) |
| Calorie ring | SVG donut used on Today (and logo) |

Keep shadcn `Button` / `Input` / `Label`; restyle variants to match teal primary and cream borders.

---

## 5. Out of scope

- New API endpoints or schema fields
- Changing auth token storage / refresh behavior
- Replacing Recharts with another chart library (restyle existing charts unless a simple SVG/CSS bar is clearly better for a specific mock section)
- Pixel-perfect parity with every sample animation
- Changing product rules (goals, imports, chat tools, etc.)

If the mock shows copy or UI that needs data we already have, wire it. If it invents data we cannot compute, approximate with existing fields or omit with a note in the phase checklist.

---

## 6. Phases

### Phase 0 — Design foundation

**Goal:** Tokens, font, and reusable shell pieces so every screen inherits the new look.

**Work**

1. Add Figtree; set body background to solid/near-solid cream (drop or soften the current radial green gradient so it matches the sample).
2. Update CSS theme tokens in `index.css` (section 4.1).
3. Restyle `button`, `input`, `card` variants lightly toward the mock (radius, border color, primary teal).
4. Add `BrandMark` (SVG progress ring + optional wordmark).
5. Optionally extract empty page-header helper if it reduces repetition.

**Files (expected)**

- `frontend/index.html` (font)
- `frontend/src/index.css`
- `frontend/src/components/ui/button*.tsx`, `input.tsx`, `card.tsx` (as needed)
- `frontend/src/components/layout/BrandMark.tsx` (new)

**Done when**

- [x] Figtree loads; theme colors match the sample palette
- [x] Existing pages still work (may look partially mixed until later phases)
- [x] Lint / typecheck pass

**Suggested commit:** `style: add UI refresh design tokens and Figtree`

---

### Phase 1 — App shell (shared sidebar)

**Goal:** Authenticated chrome matches the **Shared sidebar** board.

**Work**

1. Rebuild `AppLayout`: flex row, cream canvas, sidebar + main outlet (no top marketing header).
2. Icon nav with Lucide (or inline paths from the sample); label **Today** for `/`.
3. Active / idle styles per mock.
4. Bottom block: initials avatar, name, link to Settings, Log out.
5. Mobile: off-canvas or top nav collapse; do not leave nav unreachable on small screens.
6. Retire or drastically simplify `UserMenu` once sidebar owns account actions.

**Files**

- `frontend/src/components/layout/AppLayout.tsx`
- `frontend/src/components/layout/AppSidebar.tsx` (new, recommended)
- `frontend/src/components/layout/UserMenu.tsx` (remove or reduce)
- `frontend/src/routes/index.tsx` (only if nav config moves)

**Done when**

- [x] Desktop sidebar matches sample structure and active states
- [x] Settings + logout reachable from sidebar
- [x] Mobile navigation works
- [x] All protected routes still render inside the shell

**Suggested commit:** `feat(ui): refresh app shell and sidebar`

**Stop here for review** before auth / Today — this is the shared frame for every later screen.

---

### Phase 2 — Sign in

**Goal:** Match the **Sign in** board.

**Work**

1. Split layout: left deep-teal brand panel (logo, headline, supporting line), right form.
2. Keep existing `loginSchema` / `useAuth().login` behavior and error handling.
3. Form styling: labels, inputs, primary CTA, “New here? Create an account”.
4. Stack to a single column on small screens (brand compact or above form).

**Files**

- `frontend/src/features/auth/pages/LoginPage.tsx`
- Optional shared `AuthSplitLayout.tsx` for login + register

**Done when**

- [x] Layout and copy tone match the sample
- [x] Login still succeeds / fails as today
- [x] Mobile layout is usable

**Suggested commit:** `feat(ui): redesign sign-in page`

---

### Phase 3 — Create account

**Goal:** Match the **Create account** board.

**Work**

1. Reuse auth split layout; left panel shows numbered steps (account → goal → first meal/import) as static onboarding copy.
2. Keep register fields: full name, email, password, timezone.
3. Add password requirement hints UI (8+, letter, digit) aligned with existing zod rules — display only, do not change backend policy.
4. Preserve timezone detection helper text.

**Files**

- `frontend/src/features/auth/pages/RegisterPage.tsx`
- Shared auth layout from Phase 2

**Done when**

- [x] Split layout + steps match sample intent
- [x] Registration + validation unchanged in behavior
- [x] Link back to sign in works

**Suggested commit:** `feat(ui): redesign create-account page`

---

### Phase 4 — Today (dashboard)

**Goal:** Match the **Today** board — highest visual impact after the shell.

**Work**

1. Greeting + date header (“Good evening, {name}”) + **Log meal** CTA.
2. Replace linear calorie `ProgressBar` hero with **SVG calorie ring** centered on remaining (or eaten if over goal).
3. Show eaten / daily goal and meal-type segment legend (Breakfast / Lunch / Dinner / Snacks) using `by_meal` totals when available.
4. Macros column with compact progress rows.
5. Meals section: grouped list with empty “Add lunch” style links to `/log` (optionally with meal query later; linking to `/log` is enough for v1).
6. **Last 7 days** mini bar strip + link to Reports — use existing reports hooks/APIs if a weekly summary is already available; otherwise a small additional client fetch to the existing range endpoint is fine (**no new backend**).
7. Empty / no-goal states redesigned but still actionable (link to Goals).

**Files**

- `frontend/src/features/dashboard/pages/DashboardPage.tsx`
- `frontend/src/features/dashboard/components/*` (ring, meals, week strip — new/updated)
- Possibly light use of `features/reports/hooks.ts`

**Done when**

- [x] Ring + macros + meals layout matches sample hierarchy
- [x] Numbers come from live `useDailySummary` (and week data if included)
- [x] No-goal and error/loading states still work

**Suggested commit:** `feat(ui): redesign Today dashboard`

**Stop here for review** — shell + auth + Today define the product’s first impression.

---

### Phase 5 — Log meal

**Goal:** Match the **Log meal** board.

**Work**

1. Page header + supporting line from the sample.
2. Two-column layout (~7/5): form left; shortcuts + recent foods (+ logged today) right.
3. Shortcut tiles: **Scan a photo** (existing dialog), **Describe in chat** (link to `/chat`).
4. Meal type control restyled as segmented control if needed.
5. Live helper line: “Adds X kcal to {meal}. Y kcal left after this” using today’s summary + form calorie field (client-side estimate).
6. Keep `EntryForm`, recent picker, edit/delete flows; restyle rather than rewrite logic.

**Files**

- `frontend/src/features/entries/pages/LogMealPage.tsx`
- `frontend/src/features/entries/components/EntryForm.tsx`
- `RecentFoodsPicker.tsx`, `ScanPhotoDialog.tsx` (presentation)

**Done when**

- [x] Layout matches sample structure
- [x] Create / scan / recent-fill still work
- [x] Narrow screens stack columns

**Suggested commit:** `feat(ui): redesign log meal page`

---

### Phase 6 — Entries

**Goal:** Match the **Entries** board.

**Work**

1. Summary subtitle (count / days / total kcal) from current list/report data when available.
2. Toolbar: range chips, meal filters, search, Log meal CTA.
3. Day-grouped presentation (sticky day headers with day total vs goal if data allows).
4. Restyle table columns toward sample (Meal, Food, Qty, Calories, P·C·F, Source, actions).
5. Preserve pagination, edit/delete dialogs, and existing query params/filters.

**Files**

- `frontend/src/features/entries/pages/EntriesPage.tsx`
- `frontend/src/features/entries/components/EntriesTable.tsx`
- `MealTypeFilter.tsx`, date range components

**Done when**

- [x] Filters and actions unchanged in behavior
- [x] Visual grouping/toolbar match sample intent
- [x] Empty / loading / error preserved

**Suggested commit:** `feat(ui): redesign entries list`

---

### Phase 7 — Reports

**Goal:** Match the **Reports** board.

**Work**

1. Title + date range chips (7 / 30 / 90 / custom).
2. Stats strip: average kcal, days logged, days within ~10% of goal (compute from existing report payloads if fields exist; otherwise derive client-side from daily series).
3. Restyle calorie trend, macro breakdown, goal comparison, micronutrient sections to sample sectioning and colors (gold / purple / teal accents).
4. Keep Recharts unless a section is simpler as CSS/SVG bars (Today-style).

**Files**

- `frontend/src/features/reports/pages/ReportsPage.tsx`
- `CalorieTrendChart.tsx`, `MacroBreakdownChart.tsx`, `GoalComparisonChart.tsx`, `MicronutrientSummary.tsx`

**Done when**

- [x] All existing report widgets still render real data
- [x] Range controls work
- [x] Visual hierarchy matches sample sections

**Suggested commit:** `feat(ui): redesign reports page`

---

### Phase 8 — Goals

**Goal:** Match the **Goals** board.

**Work**

1. Two-up top: **Daily goal** card + **Weight** progress card.
2. Restyle change-goals form and weight log form.
3. Goal history + weigh-ins tables with sample-like density.
4. Preserve create/update goal and weight logging mutations.

**Files**

- `frontend/src/features/goals/pages/GoalsPage.tsx`
- `CurrentGoalCard.tsx`, `WeightProgressCard.tsx`, `GoalForm.tsx`, `WeightLogForm.tsx`, history tables

**Done when**

- [x] Layout matches sample sections
- [x] Goal/weight flows still succeed end to end

**Suggested commit:** `feat(ui): redesign goals page`

---

### Phase 9 — Chat

**Goal:** Match the **Chat** board.

**Work**

1. Inner grid: ~280px conversation list + main thread.
2. Restyle message bubbles (user teal, assistant soft surface), composer, suggested prompts, action chips.
3. “New chat” affordance matching sample placement.
4. Preserve streaming/hooks behavior.

**Files**

- `frontend/src/features/chat/pages/ChatPage.tsx`
- `ConversationList.tsx`, `MessageBubble.tsx`, `ChatComposer.tsx`, `SuggestedPrompts.tsx`, `ActionChips.tsx`, etc.

**Done when**

- [x] Split pane matches sample on desktop; stacks or drawers on mobile
- [x] Send / history / actions still work

**Suggested commit:** `feat(ui): redesign chat page`

---

### Phase 10 — Import

**Goal:** Match the **Import** board.

**Work**

1. Visible step indicator: Upload → Review → Import.
2. Restyle upload dropzone, date-format callout, preview table, confirm CTA, past imports list.
3. Preserve existing import job polling and error states.

**Files**

- `frontend/src/features/imports/pages/ImportPage.tsx`
- `ImportUpload.tsx`, `ImportPreviewTable.tsx`, `ImportHistory.tsx`

**Done when**

- [x] Step UI reflects actual flow state
- [x] Upload → preview → commit still works
- [x] History list readable and on-brand

**Suggested commit:** `feat(ui): redesign import page`

---

### Phase 11 — Settings

**Goal:** Match the **Settings** board.

**Work**

1. Profile header (avatar initials, name, email).
2. Form layout for full name + timezone; email read-only callout.
3. Save state (“No unsaved changes” / dirty) if easy with current form state; do not block on perfect parity.
4. Log out section at bottom.
5. Ensure sidebar Settings active state works (Phase 1).

**Files**

- `frontend/src/features/auth/pages/SettingsPage.tsx`

**Done when**

- [x] Profile update still works
- [x] Layout matches sample intent

**Suggested commit:** `feat(ui): redesign settings page`

---

### Phase 12 — Cross-screen polish

**Goal:** Consistency pass after all screens exist.

**Work**

1. Align spacing, radii, and chip styles across pages.
2. Mobile QA for every route.
3. Loading / empty / error states share the new visual language.
4. Remove leftover old header/card patterns that clash.
5. Optional: short note in `README.md` that UI follows the refresh sample (only if you want docs updated).

**Done when**

- [x] No obvious mixed “old card shell” vs “new cream shell” on primary flows
- [x] Lint, typecheck, and production build pass
- [x] Spot-check against each sample board

**Suggested commit:** `style(ui): polish redesign consistency`

---

## 7. Progress tracker

| Phase | Screen / focus | Status |
|---|---|---|
| 0 | Design foundation | Done |
| 1 | App shell / sidebar | Done |
| 2 | Sign in | Done |
| 3 | Create account | Done |
| 4 | Today | Done |
| 5 | Log meal | Done |
| 6 | Entries | Done |
| 7 | Reports | Done |
| 8 | Goals | Done |
| 9 | Chat | Done |
| 10 | Import | Done |
| 11 | Settings | Done |
| 12 | Polish | Done |

Update status to **In progress** / **Done** as phases complete.

---

## 8. Verification

After each phase:

```bash
cd frontend && npm run lint && npm run typecheck
```

After Phase 12 (or any large batch):

```bash
cd frontend && npm run build
```

Manual check:

1. Open the matching board in `docs/samples/Calorie Tracker UI Refresh.html`.
2. Compare layout hierarchy (not every pixel).
3. Exercise the happy path for that screen (login, log meal, etc.) against the local API.

---

## Recommended review checkpoints

Work screen-by-screen, but pause for a product/visual review after:

1. **Phase 1** — shell locked  
2. **Phase 4** — first impression (auth + Today) locked  
3. **Phase 12** — full-app consistency  

When you are ready to implement, start with **Phase 0**, then **Phase 1**, and continue in order unless you explicitly want a different screen next.
