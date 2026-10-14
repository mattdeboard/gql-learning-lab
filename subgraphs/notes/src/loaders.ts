import DataLoader from 'dataloader';
import { getNoteTable } from './data.ts';

export function createNotesByDailyLogIdDataLoader() {
  return new DataLoader(async (ids: readonly string[]) => {
    const notes = await getNoteTable().select().whereIn('dailyLogId', ids);
    const groups = Map.groupBy(notes, (note) => note.dailyLogId);
    return ids.map((id) => groups.get(id) ?? []);
  });
}
