import type { IncomingHttpHeaders } from 'node:http';
import { createContext } from '@lab/shared/context';
import { loaderContext } from './loaders.ts';

// Everything a daily-logs resolver receives as `context`. getContext runs once per
// request, so anything created here (e.g. loaders) is fresh for each request.
export type DailyLogsContext = Awaited<ReturnType<typeof getContext>>;

export async function getContext(headers: IncomingHttpHeaders) {
  return createContext(headers, 'daily-logs', loaderContext());
}
