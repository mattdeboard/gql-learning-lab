import DataLoader from 'dataloader';
import { groupedLoader, projectsWithPermissions } from '@lab/shared/loaders';
import { type PhotoEntity, getPhotoTable } from './data.ts';
import { isPermsFn, type PermissionsFn } from '@lab/shared/context';

const _GROUP_LOADERS = ['photosByProjectLoader', 'photosByDailyLogLoader', 'photosByUserLoader'] as const;
export type LoaderContext = {
  [key in (typeof _GROUP_LOADERS)[number]]: DataLoader<string, PhotoEntity[], string>;
} & { photosByIdLoader: DataLoader<string, PhotoEntity | null, string> };

export async function loaderContext(permsFn?: PermissionsFn): Promise<LoaderContext> {
  isPermsFn(permsFn);
  return {
    photosByDailyLogLoader: groupedLoader(getPhotoTable, 'dailyLogId'),
    photosByProjectLoader: groupedLoader(getPhotoTable, 'projectId'),
    photosByUserLoader: groupedLoader(getPhotoTable, 'uploadedBy'),
    photosByIdLoader: photosByIdLoader(permsFn),
  };
}

function photosByIdLoader(permsFn: PermissionsFn) {
  return new DataLoader(async (ids: readonly string[]) => {
    const perms = await permsFn();
    const allowedProjectIds = projectsWithPermissions(perms, { all: ['read:photos'] });
    const photos = await getPhotoTable()
      .select()
      .whereIn('id', ids)
      .and.whereIn('projectId', allowedProjectIds);
    const map = new Map(photos.map((p) => [p.id, p]));
    return ids.map((id) => map.get(id) ?? null);
  });
}
