// Runs a saved operation from queries/ against the router and shows what happened.
//
//   npm run op -- queries/dailyLogsBy.graphql
//   npm run op -- queries/dailyLogsBy.graphql --as user-9
//   npm run op -- queries/dailyLogsBy.graphql --vars '{"filters": {"status": "DRAFT"}}'
//   npm run op -- queries/dailyLogsBy.graphql --as none          # no Authorization header
//
// Variables come from --vars if given, otherwise from a sibling file:
// queries/dailyLogsBy.graphql -> queries/dailyLogsBy.variables.json
//
// Prints the query plan, the response, and (if `npm run dev:log` is writing
// logs/dev.log) the subgraph log lines this request produced, with counts.

import { existsSync, readFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';

const ROUTER_URL = 'http://localhost:4000/';
const LOG_FILE = new URL('../logs/dev.log', import.meta.url);

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    as: { type: 'string', default: 'user-1' },
    vars: { type: 'string' },
  },
});

const file = positionals[0];
if (!file) {
  console.error('usage: npm run op -- queries/<name>.graphql [--as user-1|none] [--vars <json>]');
  process.exit(1);
}

const query = readFileSync(file, 'utf8');

const variablesFile = file.replace(/\.graphql$/, '.variables.json');
let variables: unknown = {};
if (values.vars !== undefined) {
  variables = JSON.parse(values.vars);
} else if (existsSync(variablesFile)) {
  variables = JSON.parse(readFileSync(variablesFile, 'utf8'));
}

const headers: Record<string, string> = {
  'content-type': 'application/json',
  'Apollo-Expose-Query-Plan': 'true',
};
if (values.as !== 'none') headers['Authorization'] = `Bearer ${values.as}`;

const logLinesBefore = countLogLines();

const response = await fetch(ROUTER_URL, {
  method: 'POST',
  headers,
  body: JSON.stringify({ query, variables }),
});
const body = (await response.json()) as {
  data?: unknown;
  errors?: unknown[];
  extensions?: { apolloQueryPlan?: { text?: string } };
};

console.log(`── ${file}  (as ${values.as}, variables ${JSON.stringify(variables)})\n`);

console.log('── query plan');
console.log(body.extensions?.apolloQueryPlan?.text ?? '(none returned)');

console.log('\n── response');
console.log(JSON.stringify({ data: body.data, errors: body.errors }, null, 2));

// Give `tee` a moment to flush the subgraphs' last lines to logs/dev.log.
await sleep(300);
printLogLinesSince(logLinesBefore);

// ---------- logs/dev.log ----------

function countLogLines(): number | null {
  if (!existsSync(LOG_FILE)) return null;
  return readFileSync(LOG_FILE, 'utf8').split('\n').length;
}

function printLogLinesSince(before: number | null): void {
  if (before === null) {
    console.log('\n── logs: logs/dev.log not found (run `npm run dev:log` to see SQL and _entities here)');
    return;
  }

  // Only the subgraph lines: "time [subgraph] kind message" (see shared/log.ts).
  const lines = readFileSync(LOG_FILE, 'utf8')
    .split('\n')
    .slice(before - 1)
    .filter((line) => /^\S+ \[[^\]]+\] \S+/.test(line));

  console.log('\n── logs');
  for (const line of lines) console.log(line);

  // e.g. "[notes] sql" -> 3
  const counts = new Map<string, number>();
  for (const line of lines) {
    const [, subgraph, kind] = line.split(/\s+/);
    if (kind === 'info') continue;
    const key = `${subgraph} ${kind}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  console.log('\n── counts');
  for (const [key, count] of [...counts].sort()) console.log(`${String(count).padStart(4)}  ${key}`);
}
