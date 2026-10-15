import DataLoader from 'dataloader';
import { groupedLoader } from '@lab/shared/loaders';
import { type PhotoEntity, getPhotoTable } from './data.ts';

const _GROUP_LOADERS = ['photosByProjectLoader', 'photosByDailyLogLoader', 'photosByUserLoader'] as const;
export type LoaderContext = {
  [key in (typeof _GROUP_LOADERS)[number]]: DataLoader<string, PhotoEntity[], string>;
} & { photosByIdLoader: DataLoader<string, PhotoEntity | null, string> };

export function loaderContext(): LoaderContext {
  return {
    photosByDailyLogLoader: groupedLoader(getPhotoTable, 'dailyLogId'),
    photosByProjectLoader: groupedLoader(getPhotoTable, 'projectId'),
    photosByUserLoader: groupedLoader(getPhotoTable, 'uploadedBy'),
    photosByIdLoader: photosByIdLoader(),
  };
}

function photosByIdLoader() {
  return new DataLoader(async (ids: readonly string[]) => {
    const photos = await getPhotoTable().select().whereIn('id', ids);
    const map = new Map(photos.map((p) => [p.id, p]));
    return ids.map((id) => map.get(id) ?? null);
  });
}
