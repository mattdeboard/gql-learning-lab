import { authnCheck, type Resolvers } from '@lab/shared/resolvers';
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
import { createSubgraphLogger } from '@lab/shared/log';
import { GraphQLError } from 'graphql';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LOGGER = createSubgraphLogger('daily-logs');

export const resolvers: Resolvers<Record<'Project', { id: string }>, DailyLogsContext> = {
  DailyLog: {
    createdBy: (log: DailyLogEntity) => {
      return { id: log.createdBy };
    },
    project: (log: DailyLogEntity, _args, { projectByIdLoader }, _info) => {
      return projectByIdLoader.load(log.projectId);
    },
  },
  Project: {
    __resolveReference: async ({ id }, { projectByIdLoader }) => {
      return projectByIdLoader.load(id);
    },
  },
  Query: {
    dailyLogsBy: async (_root, { filters }: { filters: DailyLogQueryInput }) => {
      return getDailyLogsBy(filters);
    },
    dailyLogsForCurrentUser: async (_root, _args, { userId, logsForUserLoader }) => {
      if (!userId) return null;
      return logsForUserLoader.load(userId);
    },
  },
  Mutation: {
    createLog: async (_root, { options }: { options: CreateDailyLogInput }, { authzCheck, userId }) => {
      if (authnCheck(userId) && (await authzCheck(options.projectId, ['create:daily-logs']))) {
        return createDailyLog(userId, options);
      }
    },
    deleteLog: async (_root, { id }: { id: string }, { authzCheck, logByIdLoader, userId }) => {
      if (authnCheck(userId)) {
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
      }
    },
    updateLog: async (
      _root,
      { options }: { options: UpdateDailyLogInput },
      { authzCheck, logByIdLoader, userId },
    ) => {
      if (authnCheck(userId)) {
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
      }
    },
  },
};
