// No loaders yet. `{}` (not Record<string, never>) so that AuthContext & LoaderContext
// stays exactly AuthContext; replace it with real loader types as you add them.

import DataLoader from 'dataloader';
import { getObservationTable, type WeatherObservationEntity } from './data.ts';
import { groupedLoader, projectsWithPermissions } from '@lab/shared/loaders';
import { isPermsFn, type PermissionsFn } from '@lab/shared/context';

export type LoaderContext = {
  weatherByDailyLogLoader: DataLoader<string, WeatherObservationEntity[], string>;
  weatherByIdLoader: DataLoader<string, WeatherObservationEntity | null, string>;
};

export async function loaderContext(permsFn?: PermissionsFn): Promise<LoaderContext> {
  isPermsFn(permsFn);
  return {
    weatherByDailyLogLoader: groupedLoader(getObservationTable, 'dailyLogId'),
    weatherByIdLoader: weatherByIdLoader(permsFn),
  };
}

function weatherByIdLoader(permsFn: PermissionsFn) {
  return new DataLoader(async (ids: readonly string[]) => {
    const perms = await permsFn();
    const allowedProjectIds = projectsWithPermissions(perms, { all: ['read:notes'] });
    const obs = await getObservationTable()
      .select()
      .whereIn('id', ids)
      .and.whereIn('projectId', allowedProjectIds);
    const map = new Map(obs.map((o) => [o.id, o]));
    return ids.map((id) => map.get(id) ?? null);
  });
}
