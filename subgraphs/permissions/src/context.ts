import type { IncomingHttpHeaders } from 'node:http';
import { authFromHeaders, type AuthContext } from '@lab/shared/context';
import { loaderContext, type LoaderContext } from './loaders.ts';
import { getPermissionsForUser, type PermissionEntity, type Role } from './data.ts';
import { createSubgraphLogger, type Logger } from '@lab/shared/log';

// Everything a permissions resolver receives as `context`. getContext runs once per
// request, so anything created here (e.g. loaders) is fresh for each request.
export type PermissionsContext = AuthContext &
  LoaderContext & {
    getMyRoleForProject: (projectId: string) => Role | null;
    logger: Logger;
    permissions: Map<string, PermissionEntity[]>;
  };

export async function getContext(headers: IncomingHttpHeaders): Promise<PermissionsContext> {
  const { userId } = authFromHeaders(headers);
  const permissions = new Map<string, PermissionEntity[]>();
  const context = {
    userId,
    ...loaderContext(),
    logger: createSubgraphLogger('permissions'),
    permissions,
    getMyRoleForProject: (projectId: string) =>
      permissions.get(projectId)?.find((perm) => perm.projectId === projectId)?.role ?? null,
  };
  if (!userId) return context;
  context.permissions = await getPermissionsForUser(userId);
  return context;
}
