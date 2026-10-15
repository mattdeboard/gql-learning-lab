import DataLoader from 'dataloader';
import { type PhotoEntity, getPhotoTable } from './data.ts';

const _GROUP_LOADERS = ['photosByProjectLoader', 'photosByDailyLogLoader', 'photosByUserLoader'] as const;
export type LoaderContext = {
  [key in (typeof _GROUP_LOADERS)[number]]: DataLoader<string, PhotoEntity[], string>;
} & { photosByIdLoader: DataLoader<string, PhotoEntity | null, string> };

export function loaderContext(): LoaderContext {
  return {
    photosByDailyLogLoader: photosByLoader('dailyLogId'),
    photosByProjectLoader: photosByLoader('projectId'),
    photosByUserLoader: photosByLoader('uploadedBy'),
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

function photosByLoader(field: keyof PhotoEntity) {
  return new DataLoader(async (ids: readonly string[]) => {
    const photos = await getPhotoTable().select().whereIn(field, ids);
    const groups = Map.groupBy(photos, (photo) => photo[field]);
    return ids.map((id) => groups.get(id) ?? []);
  });
}
