import type { IncomingHttpHeaders } from 'node:http';
import { createContext } from '@lab/shared/context';
import { loaderContext } from './loaders.ts';
import type { ResourcePermission } from '@lab/shared/permissions/client';
import { getPermissionsForUser } from './data.ts';

// Everything a permissions resolver receives as `context`. getContext runs once per
// request, so anything created here (e.g. loaders) is fresh for each request.
export type PermissionsContext = Awaited<ReturnType<typeof getContext>>;

export async function getContext(headers: IncomingHttpHeaders) {
  const getPermissions = async (userId: string) => {
    const perms = await getPermissionsForUser(userId);
    const entries = perms.entries();
    const permissions: Record<string, ResourcePermission[]> = {};
    for (const [projectId, perms] of entries) {
      permissions[projectId] = perms.map((p) => p.permissionName);
    }
    return permissions;
  };
  const ctx = await createContext(headers, 'permissions', loaderContext, getPermissions);

  return {
    ...ctx,
    getPermissions,
  };
}
