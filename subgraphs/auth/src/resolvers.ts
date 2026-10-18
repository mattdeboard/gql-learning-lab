import type { Resolvers } from '@lab/shared/resolvers';

export const resolvers: Resolvers = {
  Query: {
    me: (_parent, _args, { userId }) => {
      return userId ? { id: userId } : null;
    },
  },
};
