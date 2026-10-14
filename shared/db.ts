import { existsSync } from 'node:fs';
import knex, { type Knex } from 'knex';
import _ from 'lodash';
import { log } from './log.ts';

// Rows from SQLite are flat (every value is a string, number, null, or Buffer),
// so converting the top-level keys is enough: { created_by: 'user-1' } -> { createdBy: 'user-1' }.
function rowToCamelCase(row: unknown): unknown {
  if (!_.isPlainObject(row)) return row; // numbers from insert/update/delete, undefined from .first(), ...
  return _.mapKeys(row as Record<string, unknown>, (_value, key) => _.camelCase(key));
}

// Opens a knex connection to a subgraph's SQLite file and logs every SQL
// statement it runs, with the bound parameters filled in.
//
// Code uses camelCase names; the database uses snake_case. knex translates
// in both directions, so data.ts never sees a snake_case name:
//   .where({ projectId })  ->  where `project_id` = ...
//   { created_by: ... }    ->  { createdBy: ... }
export function openDb(subgraph: string, file: string): Knex {
  if (!existsSync(file)) {
    throw new Error(`[${subgraph}] database not found at ${file}. Run \`npm run seed\` first.`);
  }

  const connection = knex({
    client: 'better-sqlite3',
    connection: { filename: file },
    useNullAsDefault: true,

    // Outgoing: camelCase column names in queries become snake_case.
    wrapIdentifier: (value, origImpl) => (value === '*' ? origImpl(value) : origImpl(_.snakeCase(value))),

    // Incoming: snake_case keys on result rows become camelCase.
    postProcessResponse: (result: unknown) =>
      Array.isArray(result) ? result.map(rowToCamelCase) : rowToCamelCase(result),
  });

  connection.on('query', ({ sql, bindings }: { sql: string; bindings: readonly Knex.RawBinding[] }) => {
    log(subgraph, 'sql', connection.raw(sql, bindings).toQuery());
  });

  return connection;
}
