import { readFileSync } from 'node:fs';
import http from 'node:http';
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { expressMiddleware } from '@as-integrations/express5';
import { buildSubgraphSchema, type GraphQLResolverMap } from '@apollo/subgraph';
import { parse } from 'graphql';
import { log, operationLogger } from '@lab/shared/log';
import { getContext, type PermissionsContext } from './context.ts';
import { internalApi } from './internal-api.ts';
import { resolvers } from './resolvers.ts';

const SUBGRAPH = 'permissions';
const PORT = 4003;

// Unlike the other subgraphs, this one runs on Express, because it serves two
// things on one port: the internal REST endpoint (/internal/access) and the
// GraphQL subgraph (/).
const app = express();
const httpServer = http.createServer(app);

app.use(internalApi);

const sdl = readFileSync(new URL('../schema.graphql', import.meta.url), 'utf8');

// While schema.graphql is a stub, keep serving /internal/access anyway so other
// subgraphs can call it. `npm run dev` restarts this process when the file changes.
if (sdl.replace(/#.*$/gm, '').trim() === '') {
  log(SUBGRAPH, 'info', 'schema.graphql is still a stub; serving only /internal/access');
} else {
  const server = new ApolloServer<PermissionsContext>({
    // The cast bridges our Resolvers type (shared/resolvers.ts), which types
    // __resolveReference correctly, to Apollo's looser GraphQLResolverMap.
    schema: buildSubgraphSchema([{ typeDefs: parse(sdl), resolvers: resolvers as GraphQLResolverMap }]),
    plugins: [operationLogger(SUBGRAPH), ApolloServerPluginDrainHttpServer({ httpServer })],
  });
  await server.start();

  app.use(
    '/',
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => getContext(req.headers),
    }),
  );
}

await new Promise<void>((resolve) => httpServer.listen({ port: PORT }, resolve));
log(SUBGRAPH, 'info', `ready at http://localhost:${PORT}/`);
