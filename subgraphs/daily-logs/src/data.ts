import { fileURLToPath } from 'node:url';
import { openDb } from '@lab/shared/db';
import { generateId } from '@lab/shared/ids';

const connection = openDb('daily-logs', fileURLToPath(new URL('../db/daily-logs.sqlite', import.meta.url)));

export type Status = 'APPROVED' | 'DRAFT' | 'SUBMITTED';

export type DailyLogQueryInput = {
  projectId?: string;
  date?: string;
  status?: Status;
};

export type CreateDailyLogInput = {
  projectId: string;
  date: string;
  status: Status;
};

export type UpdateDailyLogInput = {
  id: string;
  status: Status;
};
export interface ProjectEntity {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface DailyLogEntity {
  id: string;
  projectId: string;
  date: string; // YYYY-MM-DD
  status: Status;
  createdBy: string; // user id
}

class DataAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataAccessError';
  }
}

export const getProjectTable = () => connection<ProjectEntity>('projects');
export const getDailyLogTable = () => connection<DailyLogEntity>('daily_logs');

// ---------- projects ----------

export async function getProjectById(id: string) {
  return await getProjectTable().where({ id }).first();
}

// Rows come back in whatever order SQLite returns them, not the order of `ids`,
// and missing ids are simply absent.
export async function getProjectsByIds(ids: readonly string[]) {
  return await getProjectTable().select().whereIn('id', ids);
}

export async function listProjects() {
  return await getProjectTable().select().orderBy('id');
}

// ---------- daily logs ----------

export async function getDailyLogsBy(filters: DailyLogQueryInput, allowedProjectIds: string[]) {
  const { projectId } = filters;
  if (projectId && !allowedProjectIds.includes(projectId)) {
    throw new DataAccessError('Invalid filter value: projectId.');
  }
  return await getDailyLogTable()
    .select()
    .where(filters)
    .and.whereIn('projectId', filters.projectId ? [filters.projectId] : allowedProjectIds)
    .orderBy('date');
}

// Rows come back in whatever order SQLite returns them, not the order of `ids`,
// and missing ids are simply absent.
export async function getDailyLogsByIds(ids: readonly string[]) {
  return await getDailyLogTable().select().whereIn('id', ids);
}

export async function getDailyLogsByProjectId(projectId: string) {
  // TODO: Row-level authorization: If the requesting user doesn't have
  // access to the project, we shouldn't return results.
  return await getDailyLogTable().select().where({ projectId }).orderBy('date');
}

export async function getLogsForUser(userId: string) {
  return await getDailyLogTable().select().where({ createdBy: userId });
}

// Mutation methods
export async function createDailyLog(userId: string, { projectId, date, status }: CreateDailyLogInput) {
  const log: DailyLogEntity = {
    id: generateId('log'),
    projectId,
    date,
    status,
    createdBy: userId,
  };
  await getDailyLogTable().insert(log);
  return log;
}

export async function deleteDailyLog(id: string) {
  const log = await getDailyLogTable().first().where({ id });
  if (!log) return null;
  await getDailyLogTable().delete().where({ id });
  return log;
}

export async function updateDailyLog({ id, status }: UpdateDailyLogInput) {
  const log = await getDailyLogTable().first().where({ id });
  if (!log) return null;
  await getDailyLogTable().update({ status }).where({ id });
  return { ...log, status };
}
