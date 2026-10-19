import type { IncomingHttpHeaders } from 'node:http';
import { authFromHeaders, authzContext, type AuthContext, type AuthzContext } from '@lab/shared/context';
import { loaderContext, type LoaderContext } from './loaders.ts';

// Everything a daily-logs resolver receives as `context`. getContext runs once per
// request, so anything created here (e.g. loaders) is fresh for each request.
export type DailyLogsContext = AuthContext & LoaderContext & AuthzContext;

export async function getContext(headers: IncomingHttpHeaders): Promise<DailyLogsContext> {
  const { userId } = authFromHeaders(headers);
  const authz = await authzContext(userId, 'daily-logs');
  return {
    userId,
    ...loaderContext(),
    ...authz,
  };
}
