import type { IncomingHttpHeaders } from 'node:http';
import { authFromHeaders, type AuthContext } from '@lab/shared/context';

// Everything a photos resolver receives as `context`. getContext runs once per
// request, so anything created here (e.g. loaders) is fresh for each request.
export type PhotosContext = AuthContext;

export function getContext(headers: IncomingHttpHeaders): PhotosContext {
  return {
    ...authFromHeaders(headers),
  };
}
