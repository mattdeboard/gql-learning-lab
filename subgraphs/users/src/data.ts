import { fileURLToPath } from 'node:url';
import { openDb } from '@lab/shared/db';

const connection = openDb('users', fileURLToPath(new URL('../db/users.sqlite', import.meta.url)));

export interface UserEntity {
  id: string;
  name: string;
  email: string;
  trade: string;
}

const getUserTable = () => connection<UserEntity>('users');

export async function getUserById(id: string) {
  return await getUserTable().where({ id }).first();
}

// Rows come back in whatever order SQLite returns them, not the order of `ids`,
// and missing ids are simply absent.
export async function getUsersByIds(ids: readonly string[]) {
  return await getUserTable().select().whereIn('id', ids);
}

export async function listUsers() {
  return await getUserTable().select().orderBy('id');
}
