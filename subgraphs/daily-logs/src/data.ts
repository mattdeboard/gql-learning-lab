import { fileURLToPath } from 'node:url';
import { openDb } from '@lab/shared/db';

const db = openDb('daily-logs', fileURLToPath(new URL('../db/daily-logs.sqlite', import.meta.url)));

export type ProjectRow = { id: string; name: string; latitude: number; longitude: number };
export type DailyLogRow = {
  id: string;
  project_id: string;
  date: string; // YYYY-MM-DD
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED';
  created_by: string; // user id
};

// ---------- projects ----------

export function getProjectById(id: string): ProjectRow | undefined {
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow | undefined;
}

// Rows come back in whatever order SQLite returns them, not the order of `ids`,
// and missing ids are simply absent.
export function getProjectsByIds(ids: readonly string[]): ProjectRow[] {
  const placeholders = ids.map(() => '?').join(', ');
  return db.prepare(`SELECT * FROM projects WHERE id IN (${placeholders})`).all(...ids) as ProjectRow[];
}

export function listProjects(): ProjectRow[] {
  return db.prepare('SELECT * FROM projects ORDER BY id').all() as ProjectRow[];
}

// ---------- daily logs ----------

export function getDailyLogById(id: string): DailyLogRow | undefined {
  return db.prepare('SELECT * FROM daily_logs WHERE id = ?').get(id) as DailyLogRow | undefined;
}

// Rows come back in whatever order SQLite returns them, not the order of `ids`,
// and missing ids are simply absent.
export function getDailyLogsByIds(ids: readonly string[]): DailyLogRow[] {
  const placeholders = ids.map(() => '?').join(', ');
  return db.prepare(`SELECT * FROM daily_logs WHERE id IN (${placeholders})`).all(...ids) as DailyLogRow[];
}

export function getDailyLogsByProjectId(projectId: string): DailyLogRow[] {
  return db
    .prepare('SELECT * FROM daily_logs WHERE project_id = ? ORDER BY date')
    .all(projectId) as DailyLogRow[];
}
