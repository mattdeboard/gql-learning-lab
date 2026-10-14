import type { Resolvers } from '@lab/shared/resolvers';
import { getUserById, listUsers } from './data.ts';

export const resolvers: Resolvers<{ User: { id: string } }> = {
  Query: {
    users: async () => {
      return listUsers();
    },
    user: async (_root, { id }: { id: string }) => {
      return getUserById(id);
    },
  },
  User: {
    __resolveReference: async ({ __typename, id }, _ctx, _info) => {
      return getUserById(id);
    },
  },
};
