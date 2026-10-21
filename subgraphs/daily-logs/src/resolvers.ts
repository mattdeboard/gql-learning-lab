import { type Resolvers } from '@lab/shared/resolvers';
import {
  createDailyLog,
  type CreateDailyLogInput,
  type DailyLogEntity,
  type DailyLogQueryInput,
  deleteDailyLog,
  getDailyLogsBy,
  updateDailyLog,
  type UpdateDailyLogInput,
} from './data.ts';
import type { DailyLogsContext } from './context.ts';
import { GraphQLError } from 'graphql';
import { GraphQLErrorForbidden } from '@lab/shared/permissions/client';

export const resolvers: Resolvers<Record<'DailyLog' | 'Project', { id: string }>, DailyLogsContext> = {
  DailyLog: {
    createdBy: (log: DailyLogEntity) => {
      return { id: log.createdBy };
    },
    project: (log: DailyLogEntity, _args, { projectByIdLoader }, _info) => {
      return projectByIdLoader.load(log.projectId);
    },
    __resolveReference: async ({ id }, { logByIdLoader }) => logByIdLoader.load(id),
  },
  Project: {
    __resolveReference: async ({ id }, { projectByIdLoader }) => {
      return projectByIdLoader.load(id);
    },
  },
  Query: {
    dailyLogsBy: async (
      _root,
      { filters }: { filters: DailyLogQueryInput },
      { authzCheck, getPermissions },
    ) => {
      const perms = await getPermissions();
      const readableProjectIds = Object.entries(perms).reduce((acc, [projectId, ps]) => {
        if (ps.includes('read:daily-logs')) {
          acc.push(projectId);
        }
        return acc;
      }, [] as string[]);
      if (filters.projectId && !readableProjectIds.includes(filters.projectId)) {
        throw new GraphQLErrorForbidden('You do not have access to the requested project.');
      }
      if (filters.projectId) await authzCheck(filters.projectId, ['read:daily-logs']);
      return getDailyLogsBy(filters, readableProjectIds);
    },
    dailyLogsForCurrentUser: async (_root, _args, { userId, logsForUserLoader }) => {
      if (!userId) return null;
      return logsForUserLoader.load(userId);
    },
  },
  Mutation: {
    createLog: async (_root, { options }: { options: CreateDailyLogInput }, { authzCheck, userId }) => {
      if (await authzCheck(options.projectId, ['create:daily-logs'])) {
        return createDailyLog(userId, options);
      }
    },
    deleteLog: async (_root, { id }: { id: string }, { authzCheck, logByIdLoader }) => {
      const log = await logByIdLoader.load(id);
      if (log === null) {
        throw new GraphQLError(`Daily Log with ID ${id} not found`, {
          extensions: {
            code: 'NOT_FOUND',
            http: {
              status: 404,
            },
          },
        });
      }

      if (await authzCheck(log.projectId, ['delete:daily-logs'])) {
        return deleteDailyLog(id);
      }
    },
    updateLog: async (
      _root,
      { options }: { options: UpdateDailyLogInput },
      { authzCheck, logByIdLoader },
    ) => {
      const log = await logByIdLoader.load(options.id);
      if (log === null) {
        throw new GraphQLError(`Daily Log with ID ${options.id} not found`, {
          extensions: {
            code: 'NOT_FOUND',
            http: {
              status: 404,
            },
          },
        });
      }

      if (await authzCheck(log.projectId, ['update:daily-logs'])) {
        return updateDailyLog(options);
      }
    },
  },
};
