import DataLoader from 'dataloader';
import type { Knex } from 'knex';
import type { ResourcePermission, UserResourcePermissionsForProject } from './permissions/client.ts';

// The columns of a row type that hold an id (string, or null for optional links).
type IdColumn<TRow> = {
  [K in keyof TRow]: TRow[K] extends string | null ? K : never;
}[keyof TRow] &
  string;

// A one-to-many loader: each key gets every row whose `column` equals it.
//
//   groupedLoader(getPhotoTable, 'dailyLogId')   // load('log-1') -> that log's photos
//
// One query per batch (`where column in (...keys)`), then rows are grouped back
// by key. A key with no rows gets [], never undefined, so results stay in key order.
export function groupedLoader<TRow extends object, TColumn extends IdColumn<TRow>>(
  table: () => Knex.QueryBuilder<TRow>,
  column: TColumn,
): DataLoader<string, TRow[]> {
  return new DataLoader(async (keys: readonly string[]) => {
    const rows = (await table().select().whereIn(column, keys)) as TRow[];
    const groups = Map.groupBy(rows, (row) => row[column] as string | null);
    return keys.map((key) => groups.get(key) ?? []);
  });
}

export type SoughtResourcePermissions = Partial<Record<'any' | 'all', ResourcePermission[]>>;

export function projectsWithPermissions(
  perms: UserResourcePermissionsForProject,
  soughtResourcePerms: SoughtResourcePermissions = {},
): string[] {
  const { any = [], all = [] } = soughtResourcePerms;

  // If there's NO perms to filter on, just return all projects.
  if (!any.length && !all.length) return Object.keys(perms);

  // This must only intersect in any way with a given `perms[projectId]`
  const anySet = new Set(any);
  // This must be a subset of given `perms[projectId]`
  const allSet = new Set(all);

  return Object.entries(perms).reduce((acc, [projectId, ps]) => {
    const permsSet = new Set(ps);
    if (permsSet.intersection(anySet).size > 0 || (allSet.size > 0 && allSet.isSubsetOf(permsSet))) {
      acc.push(projectId);
    }
    return acc;
  }, [] as string[]);
}
