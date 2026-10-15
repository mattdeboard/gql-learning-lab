import type { IncomingHttpHeaders } from 'node:http';
import { authFromHeaders, type AuthContext } from '@lab/shared/context';
import { loaderContext, type LoaderContext } from './loaders.ts';

// Everything a comments resolver receives as `context`. getContext runs once per
// request, so anything created here (e.g. loaders) is fresh for each request.
export type DailyLogsContext = AuthContext & LoaderContext;

export function getContext(headers: IncomingHttpHeaders): DailyLogsContext {
  return {
    ...authFromHeaders(headers),
    ...loaderContext(),
  };
}
