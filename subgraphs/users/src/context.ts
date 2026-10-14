import { authFromHeaders, type AuthContext } from '@lab/shared/context';
import { createUsersLoader } from './loaders.ts';
import type { IncomingHttpHeaders } from 'http';

export type UsersContext = AuthContext & {
  userLoader: ReturnType<typeof createUsersLoader>;
};

export function getContext(headers: IncomingHttpHeaders): UsersContext {
  return {
    ...authFromHeaders(headers),
    userLoader: createUsersLoader(),
  };
}
