import { authnCheck, type Resolvers } from '@lab/shared/resolvers';
import { createOrUpdateMembership, type MembershipEntity } from './data.ts';
import type { PermissionsContext } from './context.ts';

export const resolvers: Resolvers<Record<never, never>, PermissionsContext> = {
  Membership: {
    project: (membership: MembershipEntity) => {
      return { id: membership.projectId };
    },
    user: (membership: MembershipEntity) => {
      return { id: membership.userId };
    },
  },
  User: {
    memberships: async (
      { id }: { id: string },
      _args,
      { userId: authnUserId, membershipsByUserIdLoader },
    ) => {
      if (authnCheck(authnUserId)) {
        return membershipsByUserIdLoader.load(id);
      }
      return null;
    },
  },
  Project: {
    memberships: async (
      { id }: { id: string },
      _args,
      { authzCheck, userId, membershipsByProjectIdLoader },
    ) => {
      if (authnCheck(userId) && (await authzCheck(id, ['read:memberships']))) {
        return membershipsByProjectIdLoader.load(id);
      }
      return null;
    },
    myRole: async ({ id }: { id: string }, _args, { membershipsByUserIdLoader, userId }) => {
      if (authnCheck(userId)) {
        const memberships = await membershipsByUserIdLoader.load(userId);
        return memberships.find((m) => m.projectId === id)?.role ?? null;
      }
      return null;
    },
  },
  Mutation: {
    createOrUpdateMembership: async (
      _root,
      { input }: { input: MembershipEntity },
      { authzCheck, userId },
    ) => {
      if (
        authnCheck(userId) &&
        (await authzCheck(input.projectId, ['create:memberships', 'update:memberships']))
      ) {
        return createOrUpdateMembership(input.userId, input.projectId, input.role);
      }
      return null;
    },
  },
};
