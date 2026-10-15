import type { Resolvers } from '@lab/shared/resolvers';
import { getNoteById, getNotesByDailyLogId, type NoteEntity } from './data.ts';
import type { NotesContext } from './context.ts';

export const resolvers: Resolvers<{ Note: { id: string }; DailyLog: { id: string } }> = {
  Note: {
    dailyLog: (note: NoteEntity) => {
      return { id: note.dailyLogId };
    },
    author: (note: NoteEntity) => {
      return { id: note.authorId };
    },
  },
  DailyLog: {
    notes: ({ id }: { id: string }, _args, { notesByLogId }: NotesContext) => {
      return notesByLogId.load(id);
    },
    __resolveReference: async ({ id }) => {
      return { id };
    },
  },
  Query: {
    noteById: async (_root, { id }: { id: string }) => {
      return getNoteById(id);
    },
    notesForDailyLog: async (_root, { dailyLogId }: { dailyLogId: string }) => {
      return getNotesByDailyLogId(dailyLogId);
    },
  },
};
