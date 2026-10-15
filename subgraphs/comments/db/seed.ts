import type Database from 'better-sqlite3';
import type { World } from '../../../scripts/world.ts';

export function seed(db: Database.Database, world: World): void {
  const insertComment = db.prepare(
    'INSERT INTO comments (id, photo_id, author_id, body, created_at) VALUES (@id, @photo_id, @author_id, @body, @created_at)',
  );
  for (const comment of world.comments) insertComment.run(comment);
}
