// No loaders yet. `{}` (not Record<string, never>) so that AuthContext & LoaderContext
// stays exactly AuthContext; replace it with real loader types as you add them.

import { groupedLoader } from '@lab/shared/loaders';
import { getMembershipTable, type MembershipEntity } from './data.ts';
import DataLoader from 'dataloader';

const _GROUP_LOADERS = ['membershipsByUserIdLoader', 'membershipsByProjectIdLoader'] as const;

export type LoaderContext = {
  [key in (typeof _GROUP_LOADERS)[number]]: DataLoader<string, MembershipEntity[], string>;
};

export function loaderContext(): LoaderContext {
  return {
    membershipsByUserIdLoader: groupedLoader(getMembershipTable, 'userId'),
    membershipsByProjectIdLoader: groupedLoader(getMembershipTable, 'projectId'),
  };
}
