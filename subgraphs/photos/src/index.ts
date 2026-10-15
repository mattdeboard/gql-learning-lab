import { readFileSync } from 'node:fs';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema, type GraphQLResolverMap } from '@apollo/subgraph';
import { parse } from 'graphql';
import { log, operationLogger } from '@lab/shared/log';
import { getContext, type PhotosContext } from './context.ts';
import { resolvers } from './resolvers.ts';

const SUBGRAPH = 'photos';
const PORT = 4008;

const sdl = readFileSync(new URL('../schema.graphql', import.meta.url), 'utf8');

// Until schema.graphql has real SDL in it, there's nothing to serve.
// `npm run dev` watches the file and restarts this process when it changes.
if (sdl.replace(/#.*$/gm, '').trim() === '') {
  log(SUBGRAPH, 'info', 'schema.graphql is still a stub; not starting');
  process.exit(0);
}

const server = new ApolloServer<PhotosContext>({
  // The cast bridges our Resolvers type (shared/resolvers.ts), which types
  // __resolveReference correctly, to Apollo's looser GraphQLResolverMap.
  schema: buildSubgraphSchema([{ typeDefs: parse(sdl), resolvers: resolvers as GraphQLResolverMap }]),
  plugins: [operationLogger(SUBGRAPH)],
});

const { url } = await startStandaloneServer(server, {
  listen: { port: PORT },
  context: async ({ req }) => getContext(req.headers),
});

log(SUBGRAPH, 'info', `ready at ${url}`);
