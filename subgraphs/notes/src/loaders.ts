import DataLoader from 'dataloader';
import { groupedLoader } from '@lab/shared/loaders';
import { getNoteTable, type NoteEntity } from './data.ts';

export type LoaderContext = {
  notesByLogId: DataLoader<string, NoteEntity[], string>;
  notesByIdLoader: DataLoader<string, NoteEntity | null, string>;
};

export function loaderContext(): LoaderContext {
  return {
    notesByLogId: groupedLoader(getNoteTable, 'dailyLogId'),
    notesByIdLoader: notesByIdLoader(),
  };
}

function notesByIdLoader() {
  return new DataLoader(async (ids: readonly string[]) => {
    const notes = await getNoteTable().select().whereIn('id', ids);
    const map = new Map(notes.map((p) => [p.id, p]));
    return ids.map((id) => map.get(id) ?? null);
  });
}
