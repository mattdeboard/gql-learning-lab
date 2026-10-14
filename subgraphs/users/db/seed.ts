import type Database from 'better-sqlite3';
import type { World } from '../../../scripts/world.ts';

export function seed(db: Database.Database, world: World): void {
  const insertUser = db.prepare(
    'INSERT INTO users (id, name, email, trade) VALUES (@id, @name, @email, @trade)',
  );
  for (const user of world.users) insertUser.run(user);
}
