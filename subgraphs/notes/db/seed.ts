import type Database from 'better-sqlite3';
import type { World } from '../../../scripts/world.ts';

export function seed(db: Database.Database, world: World): void {
  const insertNote = db.prepare(
    'INSERT INTO notes (id, daily_log_id, author_id, body, created_at) VALUES (@id, @daily_log_id, @author_id, @body, @created_at)',
  );
  for (const note of world.notes) insertNote.run(note);
}
