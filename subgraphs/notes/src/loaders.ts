import type DataLoader from 'dataloader';
import { groupedLoader } from '@lab/shared/loaders';
import { getNoteTable, type NoteEntity } from './data.ts';

export type LoaderContext = {
  notesByLogId: DataLoader<string, NoteEntity[], string>;
};

export function loaderContext(): LoaderContext {
  return {
    notesByLogId: groupedLoader(getNoteTable, 'dailyLogId'),
  };
}
