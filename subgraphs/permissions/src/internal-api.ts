import express from 'express';
import { createSubgraphLogger, log } from '@lab/shared/log';
import { getMembership, getMembershipsForPairs, getPermissionsForUser, type Role } from './data.ts';
import type { ResourcePermission } from '@lab/shared/permissions/client';

// Internal REST endpoint, outside the graph: "may this user access this project?"
// Other subgraphs can call it however they like (that's a Level 4 decision);
// the router never sees these calls.
//
//   GET  /internal/access?userId=user-1&projectId=project-1
//     -> { "allowed": true, "role": "SUPERINTENDENT" }
//
//   POST /internal/access/batch   { "pairs": [{ "userId": "user-1", "projectId": "project-1" }, ...] }
//     -> { "results": [{ "userId": "user-1", "projectId": "project-1", "allowed": true, "role": "SUPERINTENDENT" }, ...] }
//        one result per pair, in the same order as the pairs

export type Access = { allowed: boolean; role: Role | null };
type Pair = { userId: string; projectId: string };

export const internalApi = express.Router();
const logger = createSubgraphLogger('permissions');

internalApi.get('/internal/access', async (req, res) => {
  const { userId, projectId } = req.query;
  if (typeof userId !== 'string' || typeof projectId !== 'string') {
    res.status(400).json({ error: 'userId and projectId query parameters are required' });
    return;
  }

  logger.rest(`GET /internal/access ${userId} ${projectId}`);
  const membership = await getMembership(userId, projectId);
  const access: Access = { allowed: membership !== undefined, role: membership?.role ?? null };
  res.json(access);
});

internalApi.get('/internal/:userId/permissions/', async (req, res) => {
  const { userId } = req.params;

  if (userId.length === 0) {
    res.status(400).json({ error: 'userId missing from request URL' });
    return;
  }

  logger.rest(`GET /internal/${userId}/permissions`);
  const perms = await getPermissionsForUser(userId);
  const entries = perms.entries();
  const permissions: Record<string, ResourcePermission[]> = {};
  for (const [projectId, perms] of entries) {
    permissions[projectId] = perms.map((p) => p.permissionName);
  }
  res.json({ permissions });
});

internalApi.post('/internal/access/batch', express.json(), async (req, res) => {
  const pairs: unknown = (req.body as { pairs?: unknown } | undefined)?.pairs;
  if (!Array.isArray(pairs) || !pairs.every(isPair)) {
    res
      .status(400)
      .json({ error: 'body must be { "pairs": [{ "userId": string, "projectId": string }, ...] }' });
    return;
  }

  log('permissions', 'rest', `POST /internal/access/batch ${pairs.length} pairs`);
  const memberships = await getMembershipsForPairs(pairs);
  const roleByPair = new Map(memberships.map((m) => [`${m.userId} ${m.projectId}`, m.role]));
  const results = pairs.map((pair) => {
    const role = roleByPair.get(`${pair.userId} ${pair.projectId}`) ?? null;
    return { ...pair, allowed: role !== null, role };
  });
  res.json({ results });
});

function isPair(value: unknown): value is Pair {
  const pair = value as Partial<Pair> | null;
  return typeof pair?.userId === 'string' && typeof pair.projectId === 'string';
}
