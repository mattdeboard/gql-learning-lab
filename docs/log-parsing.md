# Reading the logs

Tools for figuring out what the graph actually did when an operation surprises you. Every log recipe below works with macOS's built-in `grep`/`sed`/`awk` and has been run against real output from this repo.

## The line format

Every subgraph line looks the same (see `shared/log.ts`):

```
12:00:14.640 [daily-logs] op       LogsView__daily_logs__1
12:00:14.650 [users] entities 1 User×1
12:00:14.652 [users] sql      SELECT * FROM users WHERE id = 'user-1'
```

| field | meaning                                                                                                                                     |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `$1`  | local time, to the millisecond                                                                                                              |
| `$2`  | `[subgraph]`                                                                                                                                |
| `$3`  | kind: `op`, `entities`, `sql`, `info`                                                                                                       |
| `$4…` | `op`: operation name · `entities`: representation count, then a per-`__typename` breakdown · `sql`: the statement with parameters filled in |

Since the fields are space-separated, `awk '$3=="sql"'` selects by kind, and `$2` gives the subgraph.

Any line **not** in this format comes from rover/the router (`==> …`, `WARN: …`, composition errors) or from `node --watch` (`Restarting 'src/index.ts'`).

### Decoding `op` names

The router names each subgraph fetch `<YourOperation>__<subgraph>__<n>`. `n` is the fetch's position in the query plan, so `LogsView__users__0` is fetch #0 in the plan for `LogsView`, sent to `users`. Unnamed client operations show up as `(anonymous)`, so name your operations in `queries/` to make the logs useful.

`_entities` fetches are logged as `entities` instead of `op`, because the interesting thing about them is the count.

## Capture to a file

```bash
npm run dev:log              # same as npm run dev, but tees everything to logs/dev.log
LEVEL=2 npm run dev:log
```

Everything below assumes `logs/dev.log`. To watch live instead, swap `logs/dev.log` for `tail -f logs/dev.log |` and add `--line-buffered` to any `grep`.

## Isolate one request

Grepping a long-running log mixes requests together. To see a single request, bookmark the line count before sending the request and print only what came after it:

```bash
mark()  { MARK=$(wc -l < logs/dev.log); }
since() { tail -n +$((MARK + 1)) logs/dev.log; }

mark
# ...run the operation in Sandbox or with curl...
since
```

All the recipes below accept `since |` in place of reading `logs/dev.log`, e.g. `since | awk '$3=="sql"'`.

## Recipes

**Only the subgraph lines (drop router noise):**

```bash
grep -E '^[0-9:.]+ \[' logs/dev.log
```

**One subgraph:**

```bash
grep '\[comments\]' logs/dev.log
```

**The plan as it actually executed** (fetches in time order):

```bash
awk '$3=="op" || $3=="entities"' logs/dev.log
```

**SQL statements per subgraph** (the before/after numbers for `docs/level-2.md`):

```bash
awk '$3=="sql" {print $2}' logs/dev.log | sort | uniq -c
```

**N+1 detector.** Replaces literals with placeholders and groups identical query shapes. If a shape shows up hundreds of times with `id = ?`, that's N+1. After adding a dataloader, it should collapse to a few `IN (?, ?, …)` lines.

```bash
awk '$3=="sql"' logs/dev.log \
  | sed -E "s/^[^ ]+ [^ ]+ sql +//; s/'[^']*'/?/g; s/[0-9]+(\.[0-9]+)?/N/g" \
  | sort | uniq -c | sort -rn
```

(Every `IN` list of a different length is its own shape. That's expected: one line per batch.)

**`_entities` calls and representation totals per subgraph:**

```bash
awk '$3=="entities" {calls[$2]++; reps[$2]+=$4}
     END {for (s in calls) printf "%-14s %3d calls %5d representations\n", s, calls[s], reps[s]}' logs/dev.log
```

**Wall-clock span of a request** (first and last subgraph line):

```bash
since | grep -E '^[0-9:.]+ \[' | awk 'NR==1 {first=$1} {last=$1} END {print first, "->", last}'
```

Use this at Level 5 to see the 800ms weather delay, and the extra sequential step `@requires` adds.

## Query plans without Sandbox

The router returns plans when asked with a header (configured in `router/router.yaml`):

```bash
plan() {  # usage: plan queries/daily-log.graphql [dry-run]
  jq -n --rawfile q "$1" '{query: $q}' \
  | curl -s localhost:4000/ \
      -H 'content-type: application/json' \
      -H 'Authorization: Bearer user-1' \
      -H "Apollo-Expose-Query-Plan: ${2:-true}" \
      -d @- \
  | jq -r '.extensions.apolloQueryPlan.text'
}
```

`dry-run` returns the plan without running anything, so no subgraph logs and no SQL. `true` runs the operation and returns the plan too, which lets you compare the plan against the `since` output line by line.

If the file has several operations, add `operationName` to the JSON.

## When the numbers look wrong

- **Fewer representations than expected.** The router de-duplicates identical representations within a fetch. Seven logs all created by `user-1` send **one** `User` representation, not seven. To see big counts, use data with varied authors (photos and comments are seeded that way).
- **No `entities` line where the plan has a `Flatten` fetch.** The fetch had nothing to resolve (every parent was null, or the list was empty), so the router skipped it.
- **`sql` lines with no `op` line before them.** That's `data.ts` running at import time, or the seed script. Neither happens during a request unless your resolvers do it.
- **A subgraph is silent.** Look for `schema.graphql is still a stub; not starting` or a crash stack trace above it. `node --watch` keeps waiting for a file change after a crash, so save the file to retry.
- **Composition failed.** Search for rover's error code: `grep -n -A30 'error\[E' logs/dev.log`. Rover keeps watching and recomposes on your next save.
