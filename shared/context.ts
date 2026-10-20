import type { IncomingHttpHeaders } from 'node:http';
import PermissionsApiClient, {
  type ResourcePermission,
  type UserResourcePermissionsForProject,
} from './permissions/client.ts';
import { createSubgraphLogger, type Logger } from './log.ts';
import { GraphQLError } from 'graphql';

export type AuthContext = {
  // null when the request has no usable Authorization header
  userId: string;
};

export type AuthzContext = {
  authzCheck: (projectId: string, permissionsAllowList: ResourcePermission[]) => Promise<boolean>;
  getPermissions: () => Promise<UserResourcePermissionsForProject>;
};

export type LoggerContext = {
  logger: Logger;
};

export type SubgraphContext<TContext extends Record<string, unknown>> = AuthContext &
  AuthzContext &
  LoggerContext &
  TContext;

// Reads the Authorization header the router propagates to every subgraph.
// Tokens are fake: "Bearer user-1" means the caller is user-1.
export function authFromHeaders(headers: IncomingHttpHeaders): AuthContext {
  const header = headers.authorization ?? '';
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  const userId = match?.[1] ?? null;
  authnCheck(userId);
  return { userId };
}

function lazy<T>(load: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | undefined;
  return () => (promise ??= load());
}

function authnCheck(userId: string | null): asserts userId is string {
  if (!userId) {
    throw new GraphQLError('Unauthorized: You must log in', {
      extensions: {
        code: 'Unauthenticated request',
      },
    });
  }
  // return true;
}

export async function createContext<TContext extends Record<string, unknown>>(
  headers: IncomingHttpHeaders,
  subgraph: string,
  additionalContext: TContext,
  getPermissionsFn?: (userId: string) => Promise<UserResourcePermissionsForProject>,
): Promise<SubgraphContext<TContext>> {
  const { userId } = authFromHeaders(headers);
  authnCheck(userId);
  const permsApiClient = new PermissionsApiClient(subgraph);
  const source = getPermissionsFn ?? ((id: string) => permsApiClient.getResourcePermsForUser(id));
  const getPermissions = lazy(() => source(userId));
  return {
    logger: createSubgraphLogger(subgraph),
    userId,
    getPermissions,
    authzCheck: async (projectId, needed) =>
      permsApiClient.authzCheck(await getPermissions(), projectId, needed),
    ...additionalContext,
  };
}
