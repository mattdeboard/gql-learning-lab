import { readFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { ApolloServer, type ApolloServerPlugin } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema, type GraphQLResolverMap } from '@apollo/subgraph';
import { parse } from 'graphql';
import { log, operationLogger } from '@lab/shared/log';
import { getContext, type WeatherContext } from './context.ts';
import { resolvers } from './resolvers.ts';

const SUBGRAPH = 'weather';
const PORT = 4005;

// This subgraph is deliberately slow, like a real third-party weather API.
// Every operation it receives (including the router's _entities calls) waits
// this long before it runs. Override with WEATHER_DELAY_MS=0 npm run dev.
const DELAY_MS = Number(process.env['WEATHER_DELAY_MS'] ?? '800');

const artificialDelay: ApolloServerPlugin<WeatherContext> = {
  async requestDidStart() {
    await sleep(DELAY_MS);
  },
};

const sdl = readFileSync(new URL('../schema.graphql', import.meta.url), 'utf8');

// Until schema.graphql has real SDL in it, there's nothing to serve.
// `npm run dev` watches the file and restarts this process when it changes.
if (sdl.replace(/#.*$/gm, '').trim() === '') {
  log(SUBGRAPH, 'info', 'schema.graphql is still a stub; not starting');
  process.exit(0);
}

const server = new ApolloServer<WeatherContext>({
  // The cast bridges our Resolvers type (shared/resolvers.ts), which types
  // __resolveReference correctly, to Apollo's looser GraphQLResolverMap.
  schema: buildSubgraphSchema([{ typeDefs: parse(sdl), resolvers: resolvers as GraphQLResolverMap }]),
  plugins: [operationLogger(SUBGRAPH), artificialDelay],
});

const { url } = await startStandaloneServer(server, {
  listen: { port: PORT },
  context: async ({ req }) => getContext(req.headers),
});

log(SUBGRAPH, 'info', `ready at ${url} (artificial delay: ${DELAY_MS}ms per operation)`);
