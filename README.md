# Daily Log Federation Lab

A hands-on Apollo Federation 2 project that simulates the **Daily Log** feature of a construction-management platform (modeled on Procore). One supergraph, many subgraphs, each owning its own data. The goal is learning by doing: entities, `@key`, `@external` / `@requires`, header propagation, cross-subgraph auth, query plans, and the N+1 problem as it actually appears in a federated graph.

> **Status: complete (October 2026).** Levels 0–6 are done: nine subgraphs compose into one supergraph, and a single operation hydrates the Daily Log view with per-project authorization. Level 7 (GraphOS) and the stretch goals were not attempted; they're described below for whoever picks this up. [Known gaps](#known-gaps) lists what's deliberately unfinished.

---

## How it works

### The composed graph

Each subgraph owns its tables and contributes fields to a shared set of entities. Entities are joined on their `@key` (`id` everywhere); no subgraph reads another's database.

| Subgraph      | Owns (resolves from its own rows)                    | Contributes to entities owned elsewhere                           | Entry points (root fields)                                           |
| ------------- | ---------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| `users`       | `User` (name, email, trade)                          | –                                                                 | `users`, `user(id)`                                                  |
| `auth`        | – (no database)                                      | –                                                                 | `me`: the caller, from the `Authorization` header                    |
| `daily-logs`  | `DailyLog`, `Project`                                | `DailyLog.createdBy` → `User`                                     | `dailyLogsBy`, `dailyLogsForCurrentUser`; create/update/delete a log |
| `notes`       | `Note`                                               | `DailyLog.notes`                                                  | `noteById`, `notesForDailyLog`                                       |
| `photos`      | `Photo`                                              | `DailyLog.photos`, `Project.photos`, `User.photos`                | `projectPhotos`, `dailyLogPhotos`, `userPhotos`; photo mutations     |
| `comments`    | `Comment`                                            | `Photo.comments`, `User.comments`                                 | `commentsForPhoto`, `commentsForUser`                                |
| `permissions` | `Membership`, `Role`                                 | `User.memberships`, `Project.memberships`, `Project.myRole`       | `userAllowedForProject`, `createOrUpdateMembership`                  |
| `weather`     | `WeatherObservation`                                 | `DailyLog.weatherObservations`, `DailyLog.forecast` (`@requires`) | none: reached only through a `DailyLog`                              |
| `crews`       | `CrewMember` (who was on site that day, and as what) | `DailyLog.crew`, `User.crewDays`                                  | none: reached only through a `DailyLog` or `User`                    |

The rule that decides who builds each connection: **whichever subgraph holds the join column can traverse it, in both directions.** Notes holds `notes.daily_log_id`, so notes adds `DailyLog.notes` (and `Note.dailyLog`); daily-logs knows nothing about notes. See [`docs/service-ownership.md`](docs/service-ownership.md).

[`queries/FullView.graphql`](queries/FullView.graphql) is the target view in one operation: logs → creator, project, notes and authors, photos → uploader, comments and authors. With loaders in place it runs in 9 SQL statements for 7 logs, 145 photos and 421 comments.

### One request, end to end

1. **The router** (`rover dev`, :4000) plans the operation across subgraphs and forwards the client's `Authorization` header to each one (`router/router.yaml`).
2. **Each subgraph builds a context** with `createContext` (`shared/context.ts`): it authenticates the caller (anonymous requests are rejected), attaches loaders, and attaches `authzCheck`.
3. **Permissions are lazy.** `getPermissions()` fetches the caller's per-project permissions on first use, at most once per request: over REST from `/internal/access` in most subgraphs, straight from the database inside `permissions`. A request that never checks makes zero lookups.
4. **Resolvers authorize with one line**, `await authzCheck(projectId, ['read:notes'])`, or let a permission-aware loader do it: by-id loaders filter rows to projects the caller can read, so every `__resolveReference` (each subgraph's `_entities` entry point) is covered too. Single objects come back `null`; lists are filtered.
5. **Loaders batch by key.** `groupedLoader(getTable, 'dailyLogId')` (`shared/loaders.ts`) turns one-to-many lookups into one `where … in (…)` per request; by-id loaders do the same for one-to-one.

### Authorization model

- **The scope is the project.** A user's role (`SUPERINTENDENT`, `PROJECT_MANAGER`, `VIEWER`) is per project, and role → permission names (`read:notes`, `delete:daily-logs`, …) live in the `permissions` table, also per project.
- **Every project-scoped row carries `project_id`**, copied at creation (notes, comments, photos, weather observations, crew members), so a subgraph can authorize any entry point without asking another service.
- **Weather reads are not checked by weather.** It has no root queries, so it's only reachable through a `DailyLog` that daily-logs already authorized. Its `project_id` exists for writes.
- The full design, including the alternatives (login claims, router coprocessor, BFF) and why this lab checks in the subgraphs, is in [`docs/level-4.md`](docs/level-4.md).

### Known gaps

- **Some list entry points aren't authorized yet:** `notesForDailyLog`, `projectPhotos` (and the other photo list queries) and `commentsForPhoto` still return another project's data to a caller without access.
- **Anonymous requests fail with a `500`**, not a clean `UNAUTHENTICATED`: the error is thrown in the context function. Rejecting them at the router (a Rhai script) would fix it.
- **A crew member can't read the logs they worked on.** Crew have no permissions by design, so `me { crewDays { date } }` returns entries with `null` dates, and the list length still reveals how many days they worked.
- **`docs/level-2.md`** (before/after SQL counts) was never written. The numbers: 17 statements before the last N+1 fix, 9 after, against roughly 570 estimated with no loaders.

---

## Who writes what

I write all the GraphQL: every `schema.graphql`, every `src/resolvers.ts` (including `__resolveReference`), dataloaders, permission logic, and the operations in `queries/`. Everything else (workspaces, bootstraps, data access, seeds, router config, logging) is scaffolding generated with Claude Code, whose instructions live in [`CLAUDE.md`](CLAUDE.md).

---

## The scenario

A superintendent ("supe") opens a single **Daily Log** for one of their projects on a tablet at the jobsite. One GraphQL operation should hydrate the whole view:

- the log itself (date, status, project, who created it)
- observed weather for that day
- the project's crew
- notes written on the log
- photos taken that day, each with its comments and comment authors

### Functional requirements

1. Fetch a single Daily Log in one operation to hydrate the view.
2. Support low/no-connectivity, high-latency environments.
3. Respect permissions: a supe sees their projects and only their projects.

### Non-functional requirements

- End-of-day burstiness (everyone submits logs ~4–6pm local)
- Steady all-day traffic otherwise

### Personas (seed data must cover all three)

- **Author**: the supe; has project permissions.
- **Crew**: users just added to a project's crew; they exist as users but have **no** project permissions.
- **Comment author**: any user who commented on a photo; each has their own permissions (some may have lost access since commenting).

---

## Architecture

```
                 ┌────────────────┐
  client ──────▶ │  Apollo Router │  :4000   (the BFF / gateway)
                 └───────┬────────┘
     ┌──────────┬────────┼─────────┬──────────┬──────────┬──────────┬──────────┐
     ▼          ▼        ▼         ▼          ▼          ▼          ▼          ▼
  users       auth   permissions daily-logs  weather    crews      notes     photos    comments
  :4001      :4002     :4003      :4004      :4005      :4006      :4007     :4008      :4009
```

One subgraph per domain. **Each subgraph owns its own SQLite file.** No subgraph reads another's database or imports another subgraph's code. Enforce this with a lint rule: `subgraphs/*` may import from `shared/` but never from another `subgraphs/*`.

### Stack

- Node 24 + TypeScript (strict), npm workspaces monorepo. Node runs the `.ts` files directly (type stripping), so there's no build step.
- `@apollo/server` + `@apollo/subgraph` per subgraph
- Apollo Router via `rover dev` locally; `rover supergraph compose` + `router` binary as the "production-like" path
- SQLite per subgraph, through knex on the `better-sqlite3` driver (camelCase in code, snake_case in the database)
- `dataloader` for per-request batching (my loaders, plus a shared `groupedLoader`)
- `concurrently` to run everything with one command
- ESLint (type-aware) + Prettier
- No GraphQL codegen

### Repo layout

```
router/
  router.yaml              # header propagation, query-plan exposure
  supergraph.yaml          # generated per LEVEL (gitignored)
subgraphs/
  users/  auth/  permissions/  daily-logs/  weather/  crews/  notes/  photos/  comments/
    schema.graphql         # mine
    src/resolvers.ts       # mine
    src/context.ts         # mine: builds the request context with createContext
    src/loaders.ts         # mine: per-request DataLoaders
    src/index.ts           # scaffolding: server bootstrap only
    src/data.ts            # scaffolding: plain query functions, no batching or caching
    db/schema.sql          # scaffolding
    db/seed.ts             # scaffolding: writes this subgraph's slice of scripts/world.ts
shared/
  db.ts                    # knex connection; logs every SQL statement; camelCase <-> snake_case
  context.ts               # createContext: authentication, lazy permissions, authzCheck
  loaders.ts               # groupedLoader, projectsWithPermissions
  permissions/client.ts    # client for permissions' REST endpoint; authzCheck
  log.ts                   # logs each incoming operation; for `_entities`, the representation count
  resolvers.ts             # Resolvers type for resolver maps
  ids.ts                   # generateId('log') for rows created at runtime
queries/                   # mine: named operations, one per .graphql file
scripts/
  subgraphs.ts             # the list of subgraphs: name, port, Level
  world.ts                 # the deterministic seed dataset
  op.ts                    # npm run op: run a saved operation, show plan, response and logs
  seed-all.ts  dev.ts  write-supergraph-config.ts  compose.sh
docs/
  log-parsing.md           # grep/awk recipes for the logs
  service-ownership.md     # working as the owner of one subgraph: contracts, roles, habits
  level-4.md               # the authorization design and its alternatives
```

### Observability is the whole point

Every subgraph logs to stdout, prefixed with its name:

- each incoming operation, and specifically each `_entities` call with **how many representations** it received
- each SQL statement executed

This is how I'll see the query plan fan out and see N+1 happen before I fix it. The logging is wired in at the server/plugin level, so it works no matter what's in the resolvers. The router also exposes query plans: send `Apollo-Expose-Query-Plan: true` (or `dry-run`) with any operation. See [`docs/log-parsing.md`](docs/log-parsing.md) for how to read all of it.

---

## Domains → subgraphs

What each subgraph owns, as **tables only** (as built; `project_id` columns are the authorization scope). The GraphQL shape is in each `schema.graphql`.

| Subgraph      | Port | Scope                                  | Tables                                                                                                            |
| ------------- | ---- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `users`       | 4001 | global                                 | `users(id, name, email, trade)`                                                                                   |
| `auth`        | 4002 | current user                           | none; reads `userId` from the propagated `Authorization` header (fake token is fine: `Bearer user-1`)             |
| `permissions` | 4003 | project                                | `project_memberships(user_id, project_id, role)`; `permissions(role, project_id, permission_name)`                |
| `daily-logs`  | 4004 | project                                | `projects(id, name, latitude, longitude)`, `daily_logs(id, project_id, date, status, created_by)`                 |
| `weather`     | 4005 | daily log                              | `weather_observations(id, project_id, daily_log_id, observed_at, sky, temp_f, precipitation, wind_mph, is_delay)` |
| `crews`       | 4006 | daily log                              | `crew_members(id, project_id, daily_log_id, user_id, role)`: who was on site that day                             |
| `notes`       | 4007 | daily log                              | `notes(id, project_id, daily_log_id, author_id, body, created_at)`                                                |
| `photos`      | 4008 | project (optionally attached to a log) | `photos(id, project_id, daily_log_id NULL, url, caption, taken_at, uploaded_by)`                                  |
| `comments`    | 4009 | photo                                  | `comments(id, project_id, photo_id, author_id, body, created_at)`                                                 |

Notes:

- `permissions` also has a small **internal REST endpoint** outside the graph: `GET /internal/access?userId=&projectId=` → `{ allowed, role }`, plus a batch variant that takes many pairs. How subgraphs use it is part of Level 4.
- `weather` has a deterministic `src/fakeForecast.ts` (`forecastFor(latitude, longitude, date)`: a location, not a project) and is **artificially slow**: `WEATHER_DELAY_MS`, default 800ms, so plan shape shows up as latency.
- `crews` models a daily log's crew (who was on site that day), not standing named crews: on real sites crews change day to day.
- `photos` are jobsite progress photos, not profile pictures, with placeholder image URLs.
- `daily-logs` holds `projects` for now because the system design doesn't name a Projects service.

---

## The target view

One operation returns, for a given Daily Log: the current user; the log's date, status, and creator; the project name, my role on it, and its crew; weather observations plus a forecast summary; notes with authors; photos with uploaders, each with comments and comment authors.

---

## Seed data

Deterministic (fixed IDs; any randomness uses a fixed seed). Minimum:

- 2 projects in different locations
- 22 users: 2 supes (one per project), 1 PM on both projects, 1 viewer, 16 crew members (8 per project, mixed trades), and a couple of users with no memberships at all
- 7 daily logs per project (one week)
- per log: 1–3 weather observations, 2–5 notes, 15–25 photos
- per photo: 0–6 comments by a mix of users, **including at least one comment author who has since lost project access**
- crew members are users with **no** `project_memberships` rows (the "just added" persona); each daily log's crew is the project's foreman plus 3–6 others

`npm run seed` wipes and reseeds every subgraph's SQLite file. Print a short summary afterward: user IDs with their roles per project, so I know which `Bearer` token to use for which persona.

---

## Levels

I worked through these in order (✅ = done). `LEVEL=n npm run dev` runs Levels 0 through n. A new Level's subgraphs start as stubs, and composition fails until I've written their schemas.

- ✅ **Level 0:** `users` + `daily-logs`. Composition, `@key`, `__resolveReference`, reading the query plan.
- ✅ **Level 1:** `notes`. Extending an entity another subgraph owns; watching `_entities` in the logs.
- ✅ **Level 2:** `photos` + `comments`. Run the view naively, count SQL statements, then fix N+1 with dataloaders. I'll write up before/after counts in `docs/level-2.md`.
- ✅ **Level 3:** `auth`. Header propagation (router config is yours), `Query.me`.
- ✅ **Level 4:** `permissions`. Where authorization belongs in a federated graph. I'll write `docs/level-4.md` comparing approaches.
- ✅ **Level 5:** `weather`. `@external` / `@requires`, and the extra sequential plan step it causes.
- ✅ **Level 6:** `crews`. Repetition to confirm the patterns stuck.
- ⬜ **Level 7 (not started):** GraphOS. Move from local composition to the GraphOS registry, and build the router-side option from `docs/level-4.md` for real.
  - Publish each subgraph with `rover subgraph publish` and compose from the registry instead of local files; gate schema changes with `rover subgraph check`.
  - Use Studio the way a subgraph owner at a real company would: explore the published supergraph, field usage, and operation traces (see `docs/service-ownership.md`).
  - Add a **coprocessor** (available on the free tier, rate limited) that fetches the caller's memberships from permissions once per request and adds them as a header for every subgraph. Compare it with the per-subgraph lookups from Level 4: calls to permissions per request, latency, and what each subgraph still has to enforce. I'll add the comparison to `docs/level-4.md`.
  - Secrets (`APOLLO_KEY`, graph ref) live in `.env`, never committed. The lab stops being offline-only at this Level.

### Stretch goals (tie back to the NFRs; not started)

- `@defer` the slow weather block (high-latency jobsite tablets)
- Persisted queries
- Write-up of a client-side offline story (cached log, queued mutations)
- `k6` load test: steady traffic plus an end-of-day burst of note writes (the operations it sends come from `queries/`)
- Split one subgraph into its own repo (composition from the GraphOS registry is covered in Level 7)

---

## Running

```bash
nvm use               # Node 24 (from .nvmrc)
npm install
npm run rover:install # once per machine: rover's router + composition plugins
npm run seed          # wipe and reseed every database; prints which Bearer token is which persona
npm run seed -- notes # reseed only the named subgraph(s); the rest keep their data
npm run dev           # subgraphs for LEVEL=0 + rover dev (router on :4000)
LEVEL=2 npm run dev   # Levels 0 through 2
npm run dev:log       # same as dev, also writes logs/dev.log
```

Local `rover` composition requires accepting Apollo's ELv2 license: `APOLLO_ELV2_LICENSE=accept` in `.env`.

Manual testing in Apollo Sandbox at `http://localhost:4000` with:

```json
{
  "Authorization": "Bearer user-1",
  "Apollo-Expose-Query-Plan": "true"
}
```

Run a saved operation from `queries/` and see its plan, response, and the SQL/`_entities` lines it caused:

```bash
npm run op -- queries/dailyLogsBy.graphql --as user-2 --vars '{"filters": {"status": "DRAFT"}}'
```

Variables default to a sibling `dailyLogsBy.variables.json`; `--as none` sends no `Authorization` header. The log section needs `npm run dev:log` running.

Each subgraph is independently startable: `npm run dev -w subgraphs/notes`.

The production-like path: `LEVEL=n npm run compose` composes `router/supergraph.graphql` with rover (LEVEL defaults to 6); `LEVEL=n npm run compose -- run` also starts the standalone router against it.

Before committing: `npm run check` (typecheck, lint, format check).
