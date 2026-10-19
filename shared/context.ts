import type { IncomingHttpHeaders } from 'node:http';
import PermissionsApiClient, { type ResourcePermission } from './permissions/client.ts';

export type AuthContext = {
  // null when the request has no usable Authorization header
  userId: string | null;
};

export type AuthzContext = {
  authzCheck: (projectId: string, permissionsAllowList: ResourcePermission[]) => boolean;
  permissions: Record<string, ResourcePermission[]>;
};

// Reads the Authorization header the router propagates to every subgraph.
// Tokens are fake: "Bearer user-1" means the caller is user-1.
export function authFromHeaders(headers: IncomingHttpHeaders): AuthContext {
  const header = headers.authorization ?? '';
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return { userId: match?.[1] ?? null };
}

export async function authzContext(userId: string | null, subgraph: string): Promise<AuthzContext> {
  const permsApiClient = new PermissionsApiClient(subgraph);
  const permissions = userId !== null ? await permsApiClient.getResourcePermsForUser(userId) : {};
  return { permissions, authzCheck: permsApiClient.authzCheck.bind(permsApiClient, permissions) };
}
