import type Database from 'better-sqlite3';
import type { World } from '../../../scripts/world.ts';

export function seed(db: Database.Database, world: World): void {
  const insertProject = db.prepare(
    'INSERT INTO projects (id, name, latitude, longitude) VALUES (@id, @name, @latitude, @longitude)',
  );
  for (const project of world.projects) insertProject.run(project);

  const insertDailyLog = db.prepare(
    'INSERT INTO daily_logs (id, project_id, date, status, created_by) VALUES (@id, @project_id, @date, @status, @created_by)',
  );
  for (const dailyLog of world.dailyLogs) insertDailyLog.run(dailyLog);
}
