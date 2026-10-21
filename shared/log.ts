import type { ApolloServerPlugin } from '@apollo/server';

// Every log line has the same shape, so it can be grepped and cut apart:
//
//   12:04:31.207 [daily-logs] op       GetDailyLog__daily_logs__0
//   12:04:31.215 [users] entities 23 User×23
//   12:04:31.216 [users] sql      select * from `users` where `id` = 'user-1' limit 1
//   12:04:31.220 [permissions] rest     GET /internal/access user-1 project-1
//
// Field 1 is a timestamp, field 2 is the subgraph, field 3 is the kind of line.
// docs/log-parsing.md relies on this format; update it if you change this.

export type LogKind = 'op' | 'entities' | 'sql' | 'rest' | 'info';

export function log(subgraph: string, kind: LogKind, message: string): void {
  const now = new Date();
  const time = `${now.toTimeString().slice(0, 8)}.${String(now.getMilliseconds()).padStart(3, '0')}`;
  console.log(`${time} [${subgraph}] ${kind.padEnd(8)} ${message}`);
}

export type Logger = Record<LogKind, (msg: string) => void>;

export function createSubgraphLogger(subgraph: string): Logger {
  return {
    info: (msg) => log(subgraph, 'info', msg),
    op: (msg) => log(subgraph, 'op', msg),
    entities: (msg) => log(subgraph, 'entities', msg),
    sql: (msg) => log(subgraph, 'sql', msg),
    rest: (msg) => log(subgraph, 'rest', msg),
  };
}

// Logs every operation a subgraph receives. When the router calls `_entities`,
// it logs how many representations arrived and how many of each __typename.
export function operationLogger(subgraph: string): ApolloServerPlugin {
  return {
    async requestDidStart({ request }) {
      const representations: unknown = request.variables?.['representations'];

      if (Array.isArray(representations)) {
        const countsByType = new Map<string, number>();
        for (const representation of representations) {
          const typename = String((representation as { __typename?: unknown }).__typename);
          countsByType.set(typename, (countsByType.get(typename) ?? 0) + 1);
        }
        const breakdown = [...countsByType].map(([typename, count]) => `${typename}×${count}`).join(' ');
        log(subgraph, 'entities', `${representations.length} ${breakdown}`);
      } else {
        log(subgraph, 'op', request.operationName ?? '(anonymous)');
      }
    },
  };
}
