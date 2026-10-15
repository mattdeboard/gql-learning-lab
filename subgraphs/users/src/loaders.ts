import DataLoader from 'dataloader';
import { getUserTable, type UserEntity } from './data.ts';

export type LoaderContext = {
  userLoader: DataLoader<string, UserEntity | null, string>;
};

export function loaderContext(): LoaderContext {
  return {
    userLoader: userByIdLoader(),
  };
}

function userByIdLoader() {
  return new DataLoader(async (ids: readonly string[]) => {
    const users = await getUserTable().select().whereIn('id', ids);
    const map = new Map(users.map((user) => [user.id, user]));
    return ids.map((id) => map.get(id) ?? null);
  });
}
