import type { IncomingHttpHeaders } from 'node:http';
import { createContext } from '@lab/shared/context';
import { loaderContext } from './loaders.ts';

export type UsersContext = Awaited<ReturnType<typeof getContext>>;

export async function getContext(headers: IncomingHttpHeaders) {
  return createContext(headers, 'users', loaderContext());
}
