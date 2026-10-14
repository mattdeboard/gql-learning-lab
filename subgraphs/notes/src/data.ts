import { openDb } from '@lab/shared/db';
import { fileURLToPath } from 'node:url';

const connection = openDb('notes', fileURLToPath(new URL('../db/notes.sqlite', import.meta.url)));

export interface NoteEntity {
  id: string;
  dailyLogId: string; // a daily log owned by the daily-logs subgraph
  authorId: string; // a user owned by the users subgraph
  body: string;
  createdAt: string;
}

export const getNoteTable = () => connection<NoteEntity>('notes');

export async function getNoteById(id: string) {
  return await getNoteTable().where({ id }).first();
}

// Rows come back in whatever order SQLite returns them, not the order of `ids`,
// and missing ids are simply absent.
export async function getNotesByIds(ids: readonly string[]) {
  return await getNoteTable().select().whereIn('id', ids);
}

export async function getNotesByDailyLogId(dailyLogId: string) {
  return await getNoteTable().select().where({ dailyLogId }).orderBy('createdAt');
}

// Notes for many daily logs in one query, all mixed together in a single array.
// Grouping them back by dailyLogId is up to the caller.
export async function getNotesByDailyLogIds(dailyLogIds: readonly string[]) {
  return await getNoteTable().select().whereIn('dailyLogId', dailyLogIds).orderBy('createdAt');
}
