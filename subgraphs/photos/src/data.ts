import { fileURLToPath } from 'node:url';
import { openDb } from '@lab/shared/db';

const connection = openDb('photos', fileURLToPath(new URL('../db/photos.sqlite', import.meta.url)));

export interface PhotoEntity {
  id: string;
  projectId: string; // a project owned by the daily-logs subgraph
  dailyLogId: string | null; // null when the photo isn't attached to a daily log
  url: string;
  caption: string;
  takenAt: string;
  uploadedBy: string; // a user owned by the users subgraph
}

const getPhotoTable = () => connection<PhotoEntity>('photos');

export async function getPhotoById(id: string) {
  return await getPhotoTable().where({ id }).first();
}

// Rows come back in whatever order SQLite returns them, not the order of `ids`,
// and missing ids are simply absent.
export async function getPhotosByIds(ids: readonly string[]) {
  return await getPhotoTable().select().whereIn('id', ids);
}

export async function getPhotosByDailyLogId(dailyLogId: string) {
  return await getPhotoTable().select().where({ dailyLogId }).orderBy('takenAt');
}

// Photos for many daily logs in one query, all mixed together in a single array.
// Grouping them back by dailyLogId is up to the caller.
export async function getPhotosByDailyLogIds(dailyLogIds: readonly string[]) {
  return await getPhotoTable().select().whereIn('dailyLogId', dailyLogIds).orderBy('takenAt');
}

// Every photo on a project, including ones not attached to any daily log.
export async function getPhotosByProjectId(projectId: string) {
  return await getPhotoTable().select().where({ projectId }).orderBy('takenAt');
}
