import type { IncomingHttpHeaders } from 'node:http';
import { createContext } from '@lab/shared/context';
import { loaderContext } from './loaders.ts';

// Everything a weather resolver receives as `context`. getContext runs once per
// request, so anything created here (e.g. loaders) is fresh for each request.
export type WeatherContext = Awaited<ReturnType<typeof getContext>>;

export async function getContext(headers: IncomingHttpHeaders) {
  return createContext(headers, 'weather', loaderContext);
}
