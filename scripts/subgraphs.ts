// The one list of subgraphs: name, port, and the Level that introduces it.
// dev.ts, seed-all.ts, and write-supergraph-config.ts all read from here.
// (Each subgraph's src/index.ts also hardcodes its own port; keep them in sync.)

export type SubgraphInfo = { name: string; port: number; level: number };

export const SUBGRAPHS: SubgraphInfo[] = [
  { name: 'users', port: 4001, level: 0 },
  { name: 'daily-logs', port: 4004, level: 0 },
  { name: 'notes', port: 4007, level: 1 },
  { name: 'photos', port: 4008, level: 2 },
  { name: 'comments', port: 4009, level: 2 },
  { name: 'auth', port: 4002, level: 3 },
  { name: 'permissions', port: 4003, level: 4 },
  { name: 'weather', port: 4005, level: 5 },
  { name: 'crews', port: 4006, level: 6 },
];

export const MAX_LEVEL = 6;

// Every subgraph introduced at or before `level`.
export function subgraphsUpToLevel(level: number): SubgraphInfo[] {
  return SUBGRAPHS.filter((subgraph) => subgraph.level <= level);
}

// Reads LEVEL from the environment (default 0) and validates it.
export function levelFromEnv(): number {
  const level = Number(process.env['LEVEL'] ?? '0');
  if (!Number.isInteger(level) || level < 0 || level > MAX_LEVEL) {
    throw new Error(`LEVEL must be an integer from 0 to ${MAX_LEVEL}, got "${process.env['LEVEL']}"`);
  }
  return level;
}
