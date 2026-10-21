import type { IncomingHttpHeaders } from 'node:http';
import { createContext } from '@lab/shared/context';
import { loaderContext } from './loaders.ts';

// Everything an auth resolver receives as `context`. getContext runs once per
// request, so anything created here (e.g. loaders) is fresh for each request.
export type AuthSubgraphContext = Awaited<ReturnType<typeof getContext>>;

export function getContext(headers: IncomingHttpHeaders) {
  return createContext(headers, 'auth', loaderContext);
}
