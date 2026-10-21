import type { Resolvers } from '@lab/shared/resolvers';
import { type NoteEntity } from './data.ts';
import type { NotesContext } from './context.ts';

export const resolvers: Resolvers<{ Note: { id: string }; DailyLog: { id: string } }, NotesContext> = {
  Note: {
    dailyLog: (note: NoteEntity) => {
      return { id: note.dailyLogId };
    },
    author: (note: NoteEntity) => {
      return { id: note.authorId };
    },
  },
  DailyLog: {
    notes: ({ id }: { id: string }, _args, { notesByLogId }) => {
      return notesByLogId.load(id);
    },
    __resolveReference: async ({ id }) => {
      return { id };
    },
  },
  Query: {
    noteById: async (_root, { id }: { id: string }, { notesByIdLoader }) => {
      return notesByIdLoader.load(id);
    },
    notesForDailyLog: async (_root, { dailyLogId }: { dailyLogId: string }, { notesByLogId }) => {
      return notesByLogId.load(dailyLogId);
    },
  },
};
