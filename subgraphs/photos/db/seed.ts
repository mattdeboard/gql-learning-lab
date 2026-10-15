import type Database from 'better-sqlite3';
import type { World } from '../../../scripts/world.ts';

export function seed(db: Database.Database, world: World): void {
  const insertPhoto = db.prepare(
    'INSERT INTO photos (id, project_id, daily_log_id, url, caption, taken_at, uploaded_by) VALUES (@id, @project_id, @daily_log_id, @url, @caption, @taken_at, @uploaded_by)',
  );
  for (const photo of world.photos) insertPhoto.run(photo);
}
