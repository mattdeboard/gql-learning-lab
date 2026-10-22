// No loaders yet. `{}` (not Record<string, never>) so that AuthContext & LoaderContext
// stays exactly AuthContext; replace it with real loader types as you add them.

import { isPermsFn, type PermissionsFn } from '@lab/shared/context';
import { groupedLoader, projectsWithPermissions } from '@lab/shared/loaders';
import DataLoader from 'dataloader';
import { getCrewMemberTable, type CrewMemberEntity } from './data.ts';

export type LoaderContext = {
  crewMemberByIdLoader: DataLoader<string, CrewMemberEntity | null, string>;
  crewMembersByLogIdLoader: DataLoader<string, CrewMemberEntity[], string>;
  crewDaysByUserIdLoader: DataLoader<string, CrewMemberEntity[], string>;
};

export async function loaderContext(permsFn?: PermissionsFn): Promise<LoaderContext> {
  isPermsFn(permsFn);
  return {
    crewMemberByIdLoader: crewMemberByIdLoader(permsFn),
    crewMembersByLogIdLoader: groupedLoader(getCrewMemberTable, 'dailyLogId'),
    crewDaysByUserIdLoader: groupedLoader(getCrewMemberTable, 'userId'),
  };
}

function crewMemberByIdLoader(permsFn: PermissionsFn) {
  return new DataLoader(async (ids: readonly string[]) => {
    const perms = await permsFn();
    // We'll just piggy back on read:daily-logs for these perms
    const allowedProjectIds = projectsWithPermissions(perms, { all: ['read:daily-logs'] });
    const obs = await getCrewMemberTable()
      .select()
      .whereIn('id', ids)
      .and.whereIn('projectId', allowedProjectIds);
    const map = new Map(obs.map((o) => [o.id, o]));
    return ids.map((id) => map.get(id) ?? null);
  });
}
