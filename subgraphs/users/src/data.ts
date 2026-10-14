import { fileURLToPath } from 'node:url';
import { openDb } from '@lab/shared/db';

const db = openDb('users', fileURLToPath(new URL('../db/users.sqlite', import.meta.url)));

export type UserRow = { id: string; name: string; email: string; trade: string };

export function getUserById(id: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}

// Rows come back in whatever order SQLite returns them, not the order of `ids`,
// and missing ids are simply absent.
export function getUsersByIds(ids: readonly string[]): UserRow[] {
  const placeholders = ids.map(() => '?').join(', ');
  return db.prepare(`SELECT * FROM users WHERE id IN (${placeholders})`).all(...ids) as UserRow[];
}

export function listUsers(): UserRow[] {
  return db.prepare('SELECT * FROM users ORDER BY id').all() as UserRow[];
}
