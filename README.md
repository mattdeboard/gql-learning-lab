# Daily Log Federation Lab

A hands-on Apollo Federation 2 project that simulates the **Daily Log** feature of a construction-management platform (modeled on Procore). One supergraph, many subgraphs, each owning its own data. The goal is learning by doing: entities, `@key`, `@external` / `@requires`, header propagation, cross-subgraph auth, query plans, and the N+1 problem as it actually appears in a federated graph.

---

## Division of labor (read this first, Claude Code)

I'm writing the GraphQL myself. That's the point of this project.

**You build the scaffolding:**

- monorepo, workspaces, `tsconfig`, lint rules, run scripts
- per-subgraph SQLite schemas (`db/schema.sql`) and deterministic seed scripts
- `shared/` utilities (SQL logging, entity-call logging, auth context parsing)
- a minimal server bootstrap per subgraph (`src/index.ts`) that loads `schema.graphql` and imports resolvers from `src/resolvers.ts`, and nothing else
- router config (`router.yaml`, `supergraph.yaml`) and composition scripts
- a data-access module per subgraph (`src/data.ts`) with plain query functions like `getNotesByDailyLogId(id)`. No batching, no caching.

**I write, and you do not:**

- every `schema.graphql` (all SDL, all federation directives)
- every `src/resolvers.ts`, including `__resolveReference`
- dataloaders
- permission enforcement logic
- the operations in `queries/`

Leave `schema.graphql` and `src/resolvers.ts` as stubs with a `TODO(matt)` comment and nothing more. Don't pre-write type names, fields, or directives in the stubs.

**When I ask for help on my GraphQL code, act as a tutor, not an author.** Explain the error, explain the federation concept behind it, point at the line. Only write the fix if I explicitly ask you to. If composition fails, show me the `rover` error verbatim first.

Optimize everything you write for legibility over cleverness. Don't add abstractions I didn't ask for.

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

- Node + TypeScript (strict), npm workspaces monorepo
- `@apollo/server` + `@apollo/subgraph` per subgraph
- Apollo Router via `rover dev` locally; `rover supergraph compose` + `router` binary as the "production-like" path
- `better-sqlite3` per subgraph
- `dataloader` installed but unused (I'll wire it up)
- `concurrently` to run everything with one command
- No GraphQL codegen

### Repo layout

```
daily-log-federation/
  router/
    router.yaml            # header propagation, query-plan exposure
    supergraph.yaml        # rover composition config
  subgraphs/
    users/  auth/  permissions/  daily-logs/  weather/  crews/  notes/  photos/  comments/
      src/index.ts         # YOU: server bootstrap only
      src/data.ts          # YOU: plain SQL query functions
      src/resolvers.ts     # ME (stub with TODO)
      schema.graphql       # ME (stub with TODO)
      db/schema.sql        # YOU
      db/seed.ts           # YOU
  shared/
    db.ts                  # wraps better-sqlite3; logs every SQL statement with subgraph name
    context.ts             # parses propagated Authorization header into { userId }
    log.ts                 # logs each incoming operation; for `_entities`, logs representation count
  queries/                 # ME
  scripts/
    seed-all.ts
    compose.sh
  README.md
```

### Observability is the whole point

Every subgraph logs to stdout, prefixed with its name:

- each incoming operation, and specifically each `_entities` call with **how many representations** it received
- each SQL statement executed

This is how I'll see the query plan fan out and see N+1 happen before I fix it. Also enable query-plan exposure on the router so I can request the plan for any operation (check current Apollo Router docs for the exact config key and request header).

Wire the logging in at the server/plugin level in `index.ts` and `shared/`, so it works no matter what I put in my resolvers.

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

Notes for you:

- `permissions` also needs a small **internal REST endpoint** outside the graph: `GET /internal/access?userId=&projectId=` → `{ allowed, role }`, plus a batch variant that takes many pairs. Build the endpoint; I'll decide how subgraphs use it.
- `weather`: provide `src/fakeForecast.ts` with a deterministic `forecastFor(projectId, date): string`. Make the subgraph **artificially slow** with a configurable delay (env var, default 800ms) applied in the bootstrap.
- `photos` are jobsite progress photos, not profile pictures. Use placeholder image URLs.
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

I work through these in order. Your job per Level is only to make sure the scaffolding for that Level's subgraphs exists and runs. Composition will fail until I've written the schemas, and that's expected.

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
- `k6` load test: steady traffic plus an end-of-day burst of note writes. You can write the k6 script; I write the operations it sends.
- Split one subgraph into its own repo and compose from a GraphOS registry instead of local files

---

## Running

```bash
npm install
npm run seed
npm run dev        # starts all subgraphs + rover dev (router on :4000)
```

Local `rover` composition requires accepting Apollo's ELv2 license: set `APOLLO_ELV2_LICENSE=accept` in `.env`.

Manual testing in Apollo Sandbox at `http://localhost:4000` with:

```json
{
  "Authorization": "Bearer user-1"
}
```

Each subgraph is independently startable: `npm run dev -w subgraphs/notes`.
