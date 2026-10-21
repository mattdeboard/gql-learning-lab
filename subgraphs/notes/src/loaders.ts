import DataLoader from 'dataloader';
import { groupedLoader } from '@lab/shared/loaders';
import { getNoteTable, type NoteEntity } from './data.ts';
import { isPermsFn, type PermissionsFn } from '@lab/shared/context';
import { projectsWithPermissions } from '@lab/shared/loaders';

export type LoaderContext = {
  notesByLogId: DataLoader<string, NoteEntity[], string>;
  notesByIdLoader: DataLoader<string, NoteEntity | null, string>;
};

export async function loaderContext(permsFn?: PermissionsFn): Promise<LoaderContext> {
  isPermsFn(permsFn);
  return {
    notesByLogId: groupedLoader(getNoteTable, 'dailyLogId'),
    notesByIdLoader: notesByIdLoader(permsFn),
  };
}

function notesByIdLoader(permsFn: PermissionsFn) {
  return new DataLoader(async (ids: readonly string[]) => {
    const perms = await permsFn();
    const allowedProjectIds = projectsWithPermissions(perms, { all: ['read:notes'] });
    const notes = await getNoteTable()
      .select()
      .whereIn('id', ids)
      .and.whereIn('projectId', allowedProjectIds);
    const map = new Map(notes.map((p) => [p.id, p]));
    return ids.map((id) => map.get(id) ?? null);
  });
}
