import { fileURLToPath } from 'node:url';
import { openDb } from '@lab/shared/db';

const connection = openDb('crews', fileURLToPath(new URL('../db/crews.sqlite', import.meta.url)));

// One person on one day's crew: who was on site for a daily log, and in what job.
export interface CrewMemberEntity {
  id: string;
  projectId: string; // the log's project; the authorization scope
  dailyLogId: string; // a daily log owned by the daily-logs subgraph
  userId: string; // a user owned by the users subgraph
  role: string; // job that day (Foreman, Electrician, ...), not a permissions role
}

export const getCrewMemberTable = () => connection<CrewMemberEntity>('crew_members');

export async function getCrewMemberById(id: string) {
  return await getCrewMemberTable().where({ id }).first();
}

export async function getCrewByDailyLogId(dailyLogId: string) {
  return await getCrewMemberTable().select().where({ dailyLogId }).orderBy('id');
}

// Crews for many daily logs in one query, all mixed together in a single array.
// Grouping them back by dailyLogId is up to the caller.
export async function getCrewByDailyLogIds(dailyLogIds: readonly string[]) {
  return await getCrewMemberTable().select().whereIn('dailyLogId', dailyLogIds).orderBy('id');
}

// Every day a user was on a crew, across logs and projects.
export async function getCrewByUserId(userId: string) {
  return await getCrewMemberTable().select().where({ userId }).orderBy('dailyLogId');
}

export async function getCrewsByUserIds(userIds: string[]) {
  return await getCrewMemberTable().select('dailyLogId').whereIn('userId', userIds).orderBy('dailyLogId');
}
