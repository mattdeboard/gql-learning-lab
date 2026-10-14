import { randomUUID } from 'node:crypto';

// IDs for rows created at runtime: generateId('log') -> 'log-3f9c2a1e-...'.
// Seeded rows keep their short readable IDs (log-1, user-1); both are just
// opaque TEXT primary keys, so nothing depends on the format.
export function generateId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}
