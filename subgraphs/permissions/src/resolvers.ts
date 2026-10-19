import { authnCheck, type Resolvers } from '@lab/shared/resolvers';
import PermissionsApiClient from '@lab/shared/permissions/client';
import { createOrUpdateMembership, type MembershipEntity } from './data.ts';
import type { PermissionsContext } from './context.ts';

const permsClient = new PermissionsApiClient('permissions');

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
      { userId, membershipsByProjectIdLoader, permissions },
    ) => {
      if (authnCheck(userId) && permsClient.authzCheck(permissions, id, ['read:memberships'])) {
        return membershipsByProjectIdLoader.load(id);
      }
      return null;
    },
    myRole: async ({ id }: { id: string }, _args, { getMyRoleForProject, userId }) => {
      if (authnCheck(userId)) {
        return getMyRoleForProject(id);
      }
      return null;
    },
  },
  Mutation: {
    createOrUpdateMembership: async (
      _root,
      { input }: { input: MembershipEntity },
      { userId, permissions },
    ) => {
      // Only project superintendent can create/update memberships for the project
      if (
        authnCheck(userId) &&
        permsClient.authzCheck(permissions, input.projectId, ['create:memberships', 'update:memberships'])
      ) {
        return createOrUpdateMembership(input.userId, input.projectId, input.role);
      }
      return null;
    },
  },
};
