import type { Resolvers } from '@lab/shared/resolvers';
import { listUsers } from './data.ts';
import type { UsersContext } from './context.ts';

export const resolvers: Resolvers<{ User: { id: string } }> = {
  Query: {
    users: async () => {
      return listUsers();
    },
    user: async (_root, { id }: { id: string }, { userLoader }: UsersContext) => {
      return userLoader.load(id);
    },
  },
  User: {
    __resolveReference: async ({ __typename, id }, { userLoader }: UsersContext, _info) => {
      return userLoader.load(id);
    },
  },
};
