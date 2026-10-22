import { fileURLToPath } from 'node:url';
import { openDb } from '@lab/shared/db';

const connection = openDb('crews', fileURLToPath(new URL('../db/crews.sqlite', import.meta.url)));

export interface CrewMemberEntity {
  id: string;
  projectId: string; // a project owned by the daily-logs subgraph
  userId: string; // a user owned by the users subgraph
  role: string; // job on the crew (Foreman, Electrician, ...), not a permissions role
  addedAt: string;
}

export const getCrewMemberTable = () => connection<CrewMemberEntity>('crew_members');

export async function getCrewMemberById(id: string) {
  return await getCrewMemberTable().where({ id }).first();
}

export async function getCrewByProjectId(projectId: string) {
  return await getCrewMemberTable().select().where({ projectId }).orderBy('addedAt');
}

// Crew members for many projects in one query, all mixed together in a single array.
// Grouping them back by projectId is up to the caller.
export async function getCrewByProjectIds(projectIds: readonly string[]) {
  return await getCrewMemberTable().select().whereIn('projectId', projectIds).orderBy('addedAt');
}

// Every crew a user is on, across projects.
export async function getCrewMembershipsByUserId(userId: string) {
  return await getCrewMemberTable().select().where({ userId }).orderBy('projectId');
}
