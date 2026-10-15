# CLAUDE.md

Instructions for Claude Code in this repo. The project itself (scenario, architecture, domains, Levels) is described in `README.md`. Read it before scaffolding a new Level.

## Division of labor

Matt is writing the GraphQL himself. That's the point of this project.

**Claude builds the scaffolding:**

- monorepo, workspaces, `tsconfig`, lint rules, run scripts
- per-subgraph SQLite schemas (`db/schema.sql`) and deterministic seed scripts
- `shared/` utilities (SQL logging, entity-call logging, auth context parsing)
- a minimal server bootstrap per subgraph (`src/index.ts`) that loads `schema.graphql` and imports resolvers from `src/resolvers.ts`, and nothing else
- router config (`router/router.yaml`, the supergraph config generator) and composition scripts
- a data-access module per subgraph (`src/data.ts`) with plain query functions like `getNotesByDailyLogId(id)`. No batching, no caching.

**Matt writes, and Claude does not:**

- every `schema.graphql` (all SDL, all federation directives)
- every `src/resolvers.ts`, including `__resolveReference`
- dataloaders
- permission enforcement logic
- the operations in `queries/`

When scaffolding a new subgraph, leave `schema.graphql` as `# TODO(matt)` and `src/resolvers.ts` as `// TODO(matt)` plus `export const resolvers = {};` (the bootstrap imports it) and nothing more. Don't pre-write type names, fields, or directives in the stubs. Add the new stub schema to `.prettierignore` (a comment-only file isn't valid GraphQL). Also give it a minimal `src/context.ts` (`<Name>Context = AuthContext` and a `getContext(headers)` returning `authFromHeaders(headers)`), which `index.ts` imports. Matt adds his per-request loaders there.

**When Matt asks for help on his GraphQL code, act as a tutor, not an author.** Explain the error, explain the federation concept behind it, point at the line. Only write the fix if he explicitly asks. If composition fails, show the `rover` error verbatim first.

Optimize everything for legibility over cleverness. Don't add abstractions he didn't ask for.

## Scaffolding still to come

Per Level, Claude's job is only to make sure that Level's subgraphs exist and run. Composition failing until Matt writes the schemas is expected.

- `permissions` (Level 4): a small **internal REST endpoint** outside the graph: `GET /internal/access?userId=&projectId=` → `{ allowed, role }`, plus a batch variant that takes many pairs. Build the endpoint; Matt decides how subgraphs use it. This subgraph uses Express (`@as-integrations/express5`); all others use `startStandaloneServer`.
- `weather` (Level 5): `src/fakeForecast.ts` with a deterministic `forecastFor(projectId, date): string`. Make the subgraph **artificially slow** with a configurable delay (env var, default 800ms), applied as an Apollo plugin in the bootstrap.
- `photos` (Level 2): jobsite progress photos, not profile pictures; placeholder image URLs (already in the seed).
- Stretch goal `k6` load test: Claude writes the k6 script; Matt writes the operations it sends.

### Deferred (Matt said "later"; bring it up when it becomes relevant, don't build unprompted)

(Nothing deferred right now.)

## How this repo works

- **Node 24 is required** (`.nvmrc`). Node runs `.ts` files directly via type stripping, with no build step and no `tsx`. That means no `enum`, `namespace`, or parameter properties (`erasableSyntaxOnly`), and relative imports spell out `.ts`. If a command fails with `Unknown file extension ".ts"`, the shell is on the wrong Node: `nvm use`.
- **Levels:** `scripts/subgraphs.ts` is the single list of subgraphs (name, port, Level). `LEVEL=n npm run dev` starts Levels 0..n and generates `router/supergraph.yaml` (gitignored). A stub subgraph exits cleanly and restarts when `schema.graphql` changes.
- **Seed:** `scripts/world.ts` builds one deterministic world; each `subgraphs/*/db/seed.ts` writes only its own tables. `npm run seed` wipes and reseeds all of them and prints the persona table; `npm run seed -- notes photos` reseeds only the named subgraphs. Seeds use `better-sqlite3` directly (they need multi-statement `schema.sql`).
- **Data access:** `shared/db.ts` returns a knex connection. Table getters are `connection<Entity>('table')` (not `.table<Entity>()`, which types results as `any`), with `.where()` before `.first()`. knex maps names both ways: code uses camelCase (`projectId`), the database uses snake_case (`project_id`). Entity interfaces in `data.ts` are camelCase.
- **IDs:** seeded rows have readable IDs (`user-1`, `log-3`); runtime-created rows use `generateId('log')` from `shared/ids.ts` (prefixed UUID).
- **Resolver types:** `shared/resolvers.ts` exports `Resolvers<{ Entity: { keyFields } }, TContext>`. The entity map mirrors each `@key` by hand. Each bootstrap casts `resolvers as GraphQLResolverMap` for `buildSubgraphSchema`.
- **Boundaries:** a subgraph may import `@lab/shared/*` but never another subgraph (enforced by ESLint). Only `scripts/` knows about every domain.
- **Logging:** every line is `time [subgraph] kind message`, where kind is `op`, `entities`, `sql` or `info`. Recipes are in `docs/log-parsing.md`. Keep that doc in sync if the format changes.
- **Running saved operations:** `npm run op -- queries/<name>.graphql [--as user-9|none] [--vars <json>]` (`scripts/op.ts`) sends the operation with its sibling `<name>.variables.json`, then prints the plan, the response, and the subgraph log lines and counts it produced (when `logs/dev.log` exists).
- **Before committing:** `npm run check` (typecheck, type-aware lint, Prettier).
