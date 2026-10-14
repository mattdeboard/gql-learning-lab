# Daily Log Federation Lab

A hands-on Apollo Federation 2 project that simulates the **Daily Log** feature of a construction-management platform (modeled on Procore). One supergraph, many subgraphs, each owning its own data. The goal is learning by doing: entities, `@key`, `@external` / `@requires`, header propagation, cross-subgraph auth, query plans, and the N+1 problem as it actually appears in a federated graph.

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
- `dataloader` installed but unused (I'll wire it up)
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
    src/index.ts           # scaffolding: server bootstrap only
    src/data.ts            # scaffolding: plain query functions, no batching or caching
    db/schema.sql          # scaffolding
    db/seed.ts             # scaffolding: writes this subgraph's slice of scripts/world.ts
shared/
  db.ts                    # knex connection; logs every SQL statement; camelCase <-> snake_case
  context.ts               # parses the propagated Authorization header into { userId }
  log.ts                   # logs each incoming operation; for `_entities`, the representation count
  resolvers.ts             # Resolvers type for resolver maps
  ids.ts                   # generateId('log') for rows created at runtime
queries/                   # mine: named operations, one per .graphql file
scripts/
  subgraphs.ts             # the list of subgraphs: name, port, Level
  world.ts                 # the deterministic seed dataset
  seed-all.ts  dev.ts  write-supergraph-config.ts  compose.sh
docs/
  log-parsing.md           # grep/awk recipes for the logs
```

### Observability is the whole point

Every subgraph logs to stdout, prefixed with its name:

- each incoming operation, and specifically each `_entities` call with **how many representations** it received
- each SQL statement executed

This is how I'll see the query plan fan out and see N+1 happen before I fix it. The logging is wired in at the server/plugin level, so it works no matter what's in the resolvers. The router also exposes query plans: send `Apollo-Expose-Query-Plan: true` (or `dry-run`) with any operation. See [`docs/log-parsing.md`](docs/log-parsing.md) for how to read all of it.

---

## Domains → subgraphs

What each subgraph owns, as **tables only**. The GraphQL shape is mine to design.

| Subgraph      | Port | Scope                                  | Tables                                                                                                 |
| ------------- | ---- | -------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `users`       | 4001 | global                                 | `users(id, name, email, trade)`                                                                        |
| `auth`        | 4002 | current user                           | none; reads `userId` from the propagated `Authorization` header (fake token is fine: `Bearer user-1`)  |
| `permissions` | 4003 | project                                | `project_memberships(user_id, project_id, role)`; role ∈ `SUPERINTENDENT`, `PROJECT_MANAGER`, `VIEWER` |
| `daily-logs`  | 4004 | project                                | `projects(id, name, latitude, longitude)`, `daily_logs(id, project_id, date, status, created_by)`      |
| `weather`     | 4005 | daily log                              | `weather_observations(id, daily_log_id, observed_at, sky, temp_f, precipitation, wind_mph, is_delay)`  |
| `crews`       | 4006 | project                                | `crew_members(id, project_id, user_id, role, added_at)`                                                |
| `notes`       | 4007 | daily log                              | `notes(id, daily_log_id, author_id, body, created_at)`                                                 |
| `photos`      | 4008 | project (optionally attached to a log) | `photos(id, project_id, daily_log_id NULL, url, caption, taken_at, uploaded_by)`                       |
| `comments`    | 4009 | photo                                  | `comments(id, photo_id, author_id, body, created_at)`                                                  |

Notes:

- `permissions` also has a small **internal REST endpoint** outside the graph: `GET /internal/access?userId=&projectId=` → `{ allowed, role }`, plus a batch variant that takes many pairs. How subgraphs use it is part of Level 4.
- `weather` has a deterministic `src/fakeForecast.ts` (`forecastFor(projectId, date)`) and is **artificially slow**: a configurable delay (env var, default 800ms).
- `photos` are jobsite progress photos, not profile pictures, with placeholder image URLs.
- `daily-logs` holds `projects` for now because the system design doesn't name a Projects service.

---

## The target view

Eventually one operation (which I'll write) should return, for a given Daily Log ID: the current user; the log's date, status, and creator; the project name, my role on it, and its crew; weather observations plus a forecast summary; notes with authors; photos with uploaders, each with comments and comment authors.

---

## Seed data

Deterministic (fixed IDs; any randomness uses a fixed seed). Minimum:

- 2 projects in different locations
- ~10 users: 2 supes (one per project), 1 PM on both projects, crew members, and a couple of users with no memberships at all
- 7 daily logs per project (one week)
- per log: 1–3 weather observations, 2–5 notes, 15–25 photos
- per photo: 0–6 comments by a mix of users, **including at least one comment author who has since lost project access**
- crew members are users with **no** `project_memberships` rows (the "just added" persona)

`npm run seed` wipes and reseeds every subgraph's SQLite file. Print a short summary afterward: user IDs with their roles per project, so I know which `Bearer` token to use for which persona.

---

## Levels

I work through these in order. `LEVEL=n npm run dev` runs Levels 0 through n. A new Level's subgraphs start as stubs, and composition fails until I've written their schemas.

- **Level 0:** `users` + `daily-logs`. Composition, `@key`, `__resolveReference`, reading the query plan.
- **Level 1:** `notes`. Extending an entity another subgraph owns; watching `_entities` in the logs.
- **Level 2:** `photos` + `comments`. Run the view naively, count SQL statements, then fix N+1 with dataloaders. I'll write up before/after counts in `docs/level-2.md`.
- **Level 3:** `auth`. Header propagation (router config is yours), `Query.me`.
- **Level 4:** `permissions`. Where authorization belongs in a federated graph. I'll write `docs/level-4.md` comparing approaches.
- **Level 5:** `weather`. `@external` / `@requires`, and the extra sequential plan step it causes.
- **Level 6:** `crews`. Repetition to confirm the patterns stuck.

### Stretch goals (tie back to the NFRs)

- `@defer` the slow weather block (high-latency jobsite tablets)
- Persisted queries
- Write-up of a client-side offline story (cached log, queued mutations)
- `k6` load test: steady traffic plus an end-of-day burst of note writes (the operations it sends come from `queries/`)
- Split one subgraph into its own repo and compose from a GraphOS registry instead of local files

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
