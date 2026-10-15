import type { IncomingHttpHeaders } from 'node:http';
import { authFromHeaders, type AuthContext } from '@lab/shared/context';
import { loaderContext, type LoaderContext } from './loaders.ts';

export type UsersContext = AuthContext & LoaderContext;

export function getContext(headers: IncomingHttpHeaders): UsersContext {
  return {
    ...authFromHeaders(headers),
    ...loaderContext(),
  };
}
