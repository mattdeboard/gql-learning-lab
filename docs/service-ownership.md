# Thinking like a service owner

Federation is designed around different teams owning different subgraphs. A useful habit in this lab is to stop "knitting nodes together" and instead act as **the developer who maintains one service**: notes, users, photos, and so on.

## The contract, not the implementation

The notes owner doesn't need to know how daily-logs works. They need to know daily-logs' **contract**, which is the part of its schema other subgraphs can rely on:

- Is `DailyLog` an entity?
- What's its `@key`? → `id`.

That's all. The notes owner never reads daily-logs' resolvers, `data.ts`, tables, or loaders. The whole question is: _"Given a `DailyLog` id, can I answer `notes` from my own database?"_ Yes, because `notes.daily_log_id` is in the notes table.

The daily-logs owner, for their part, doesn't need to know notes exists at all. (Level 1 ended up this way: the `Note` stub was removed from daily-logs.)

The internal monologue, as the notes owner:

> I need to add notes to daily logs. Let me look at the supergraph schema to see what `DailyLog` exposes as its key. `id`, good, I store that. I'll declare that I extend `DailyLog`, and resolve `notes` from my table.

## Think in fields, not arrows between services

It's tempting to draw services as boxes with arrows between them ("notes → users"). That picture misleads. "Extending" and "referencing" aren't roles a _service_ plays; they're properties of individual _fields_, and one subgraph often does both with the same type. Notes does:

| Field (resolved by notes) | Parent comes from                        | Returns              |
| ------------------------- | ---------------------------------------- | -------------------- |
| `DailyLog.notes`          | a `DailyLog` **key** the router hands in | notes' own rows      |
| `Note.dailyLog`           | notes' own row                           | a `DailyLog` **key** |
| `Note.author`             | notes' own row                           | a `User` **key**     |

Between notes and `DailyLog`, the relationship goes both ways, and notes implements both directions. That follows from one rule: **whoever holds the join column can traverse it in both directions.** Notes holds `notes.daily_log_id`, so it can turn a log into its notes _and_ a note into its log.

Every field has two ends, and each end asks one question:

- **Input end:** do I own this parent type's rows, or does the router hand me only its key? If it's only the key, I have to accept references to that type (`@key` with a `__resolveReference`). This is what "extending" means.
- **Output end:** do I return my own rows, or only another type's key? If it's only the key, I return `{ id }` and stop; I don't fetch other teams' data. This is what "referencing" means.

A single field can be both. A hypothetical `DailyLog.uploaders: [User]` in photos would receive `DailyLog` keys _and_ emit `User` keys.

### When your subgraph creates an entity's rows

Some questions apply only to the subgraph whose database _creates_ an entity's identities (users for `User`, daily-logs for `DailyLog`):

- What's my key? Other teams store it in their tables, so changing it breaks composition for _them_.
- What should `__resolveReference` cost? I don't control how often, or with how many references, the router calls it.

### What `__resolveReference` should return

**Owners load the row; extenders pass the key through.**

`__resolveReference` turns the key the router sends (`{ __typename: "Project", id: "project-1" }`) into the object that the rest of your resolvers for that type receive as their parent. What it should return depends on whether your subgraph has the rows:

| Your subgraph…                                                   | `__resolveReference` returns                                               | Example                                               |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------- |
| **owns the rows** (the type's own fields live in your database)  | the loaded row, via a by-id loader                                         | daily-logs' `Project`, users' `User`, photos' `Photo` |
| **only extends the type** (you add fields computed from the key) | the reference itself, `{ id }` (also the default if you omit the resolver) | notes' `DailyLog`, permissions' `User` and `Project`  |

The two ways to get it wrong look different:

- **An owner returning `{ id }`:** the router asks for `name`, the default resolver reads `{ id }.name`, and you get `null` (or a non-null error). In the logs: an `entities` line with no `sql` line after it.
- **An extender loading data in `__resolveReference`:** whatever it returns becomes the parent object, so returning, say, the notes array makes the "DailyLog" an array and `DailyLog.notes` comes back empty or `null` (Level 1). The lookup belongs in the field resolver (`DailyLog.notes`).

We call that subgraph the entity's "owner," but in Federation 2 that's a team convention, not something the schema records. Every subgraph that declares `DailyLog @key(fields: "id")` is a peer contributor to the same entity; there's no `extend type` distinction anymore. The key is the only thing they share.

## Three graphs that service arrows squash together

1. **The type graph**, which is the supergraph schema: `DailyLog` → `Note` → `User`, with fields as the edges. It has no services in it.
2. **Field placement**: which subgraph resolves each field. This is where services come in, and it labels the type graph's edges rather than adding arrows of its own.
3. **The query plan**: the runtime fetch order for _one particular query_ (see it with `Apollo-Expose-Query-Plan: true` or `npm run op`). It follows the query's selection path, so it can zigzag: daily-logs → notes → users, or daily-logs → users and notes in parallel.

"Notes → users" is really a statement about graph 3: _for this query_, the plan fetches from users after notes. It's not a fact about how the two services relate.

## Ways to make the persona stick

- **Work on one subgraph at a time.** When you're "the photos dev," open only `subgraphs/photos/`. For anything outside it, read only the _composed supergraph schema_ (`LEVEL=n npm run compose` writes it to `router/supergraph.graphql`), not other subgraphs' source.
- **Treat composition errors as messages from another team.** "Your change broke composition" is what you'd hear from CI in a real organization.
- **Watch `_entities` from the receiving side.** When `[photos] entities 21 DailyLog×21` arrives, the photos dev's question is _"can I serve 21 at once?"_, not _"why did the router send 21?"_ (See `docs/log-parsing.md`.)
- **The stretch goal of splitting one subgraph into its own repo** makes this physical: once the code isn't in the same folder, there's nothing to peek at.

## Level 2 as a three-team exercise

Level 2 is the first Level where this matters across several teams at once:

- **photos** holds `photos.daily_log_id` and `photos.uploaded_by`, so it can attach photos to a `DailyLog` it receives by key, and hand out `User` keys for uploaders.
- **comments** holds `comments.photo_id` and `comments.author_id`, so it can attach comments to a `Photo` it receives by key, and hand out `User` keys for authors. Receiving `Photo` by key only works once photos has published `Photo` as an entity: a contract comments depends on.
- **users** receives `User` keys from everyone and has to answer all of them, whoever sends them.
