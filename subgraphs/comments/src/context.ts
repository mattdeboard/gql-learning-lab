import type { IncomingHttpHeaders } from 'node:http';
import { loaderContext } from './loaders.ts';
import { createContext } from '@lab/shared/context';

// Everything a comments resolver receives as `context`. getContext runs once per
// request, so anything created here (e.g. loaders) is fresh for each request.
export type CommentsContext = Awaited<ReturnType<typeof getContext>>;

export function getContext(headers: IncomingHttpHeaders) {
  return createContext(headers, 'comments', loaderContext());
}
