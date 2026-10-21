import { fileURLToPath } from 'node:url';
import { openDb } from '@lab/shared/db';
import type { ResourcePermission } from '@lab/shared/permissions/client';

const connection = openDb('permissions', fileURLToPath(new URL('../db/permissions.sqlite', import.meta.url)));

export type Role = 'SUPERINTENDENT' | 'PROJECT_MANAGER' | 'VIEWER';

export interface MembershipEntity {
  userId: string; // a user owned by the users subgraph
  projectId: string; // a project owned by the daily-logs subgraph
  role: Role;
}

export interface PermissionEntity {
  id: number;
  role: Role;
  projectId: string;
  permissionName: ResourcePermission;
}

export type User = {
  id: string;
  memberships: MembershipEntity[];
};

export type UserAllowedForProjectInput = {
  userId: string;
  projectId: string;
};

export type UserPermissions = Map<string, PermissionEntity[]>;

export const getMembershipTable = () => connection<MembershipEntity>('project_memberships');
export const getPermissionsTable = () => connection<PermissionEntity>('permissions');

export async function getMembership(userId: string, projectId: string) {
  return await getMembershipTable().where({ userId, projectId }).first();
}

// Memberships for many (userId, projectId) pairs in one query.
// Pairs with no membership are simply absent from the result.
export async function getMembershipsForPairs(pairs: readonly { userId: string; projectId: string }[]) {
  return await getMembershipTable()
    .select()
    .whereIn(
      ['userId', 'projectId'],
      pairs.map((pair) => [pair.userId, pair.projectId]),
    );
}

export async function getMembershipsByUserId(userId: string) {
  return await getMembershipTable().select().where({ userId }).orderBy('projectId');
}

export async function getMembershipsByProjectId(projectId: string) {
  return await getMembershipTable().select().where({ projectId }).orderBy('userId');
}

export async function createOrUpdateMembership(userId: string, projectId: string, desiredRole: Role) {
  const existing = await getMembership(userId, projectId);

  if (existing && existing.role === desiredRole) {
    return existing;
  }

  const membership = { ...existing, role: desiredRole };
  if (existing) {
    await getMembershipTable().update({ role: desiredRole }).where({ userId, projectId });
    return membership;
  }

  await getMembershipTable().insert(membership);
  return membership;
}

export async function getRoleForProject(userId: string, projectId: string): Promise<Role | null> {
  if (userId === null) return null;
  const membership = await getMembership(userId, projectId);
  return membership?.role ?? null;
}

export async function getPermissionsForUser(userId: string): Promise<UserPermissions> {
  const memberships = await getMembershipsByUserId(userId);
  if (!memberships.length) return new Map();
  const projects = memberships.reduce(
    (acc, elem) => {
      acc.push([elem.projectId, elem.role]);
      return acc;
    },
    [] as [string, Role][],
  );
  const permissions = await getPermissionsTable().select().whereIn(['projectId', 'role'], projects);
  return Map.groupBy(permissions, (p) => p.projectId);
}
