import { existsSync } from 'node:fs';
import Database from 'better-sqlite3';
import { log } from './log.ts';

// Opens a subgraph's SQLite file and logs every SQL statement it runs,
// with the bound parameters filled in.
export function openDb(subgraph: string, file: string): Database.Database {
  if (!existsSync(file)) {
    throw new Error(`[${subgraph}] database not found at ${file}. Run \`npm run seed\` first.`);
  }
  return new Database(file, {
    verbose: (sql) => log(subgraph, 'sql', String(sql)),
  });
}
