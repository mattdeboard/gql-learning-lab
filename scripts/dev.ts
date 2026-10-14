// Starts the subgraphs for a Level plus `rover dev` (router on :4000).
//   npm run dev              # LEVEL=0
//   LEVEL=2 npm run dev      # Levels 0–2

import { existsSync } from 'node:fs';
import concurrently from 'concurrently';
import { levelFromEnv, subgraphsUpToLevel } from './subgraphs.ts';
import { writeSupergraphConfig } from './write-supergraph-config.ts';

const level = levelFromEnv();
const subgraphs = subgraphsUpToLevel(level);

const missing = subgraphs.filter(({ name }) => !existsSync(new URL(`../subgraphs/${name}`, import.meta.url)));
if (missing.length > 0) {
  console.error(
    `LEVEL=${level} needs subgraphs that aren't scaffolded yet: ${missing.map((s) => s.name).join(', ')}`,
  );
  process.exit(1);
}

writeSupergraphConfig(level);
console.log(`LEVEL=${level}: starting ${subgraphs.map((s) => s.name).join(', ')} + router`);

const { result } = concurrently(
  [
    ...subgraphs.map(({ name }) => ({ name, command: `npm run dev --silent -w subgraphs/${name}` })),
    {
      name: 'router',
      command:
        'rover dev --supergraph-config router/supergraph.yaml --router-config router/router.yaml --supergraph-port 4000',
    },
  ],
  {
    // Subgraph lines already carry their own [name] prefix (see shared/log.ts).
    prefix: 'none',
    killOthersOn: ['failure'],
  },
);

await result.catch(() => process.exit(1));
