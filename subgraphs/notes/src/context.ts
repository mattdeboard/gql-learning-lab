import type { IncomingHttpHeaders } from 'node:http';
import { authFromHeaders, type AuthContext } from '@lab/shared/context';
import { createNotesByDailyLogIdDataLoader } from './loaders.ts';

// Everything a notes resolver receives as `context`: the caller's userId,
// plus loaders. getContext runs once per request, so each request gets
// fresh loaders (and a fresh cache).
export type NotesContext = AuthContext & {
  notesByLogId: ReturnType<typeof createNotesByDailyLogIdDataLoader>;
};

export function getContext(headers: IncomingHttpHeaders): NotesContext {
  return {
    ...authFromHeaders(headers),
    notesByLogId: createNotesByDailyLogIdDataLoader(),
  };
}
