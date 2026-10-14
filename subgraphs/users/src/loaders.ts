import DataLoader from 'dataloader';
import { getUserTable } from './data.ts';

export function createUsersLoader() {
  return new DataLoader(async (userIds: readonly string[]) => {
    const users = await getUserTable().select().whereIn('id', userIds);
    return userIds.map((id) => users.find((u) => u.id === id));
  });
}
