import type { Resolvers } from '@lab/shared/resolvers';
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
    createLog: async (_root, { options }: { options: CreateDailyLogInput }) => {
      // TODO: Replace hard-coded user ID with auth middleware + context
      return createDailyLog('user-1', options);
    },
    deleteLog: async (_root, { id }: { id: string }) => {
      // TODO: Authn (auth middleware + context)
      return deleteDailyLog(id);
    },
    updateLog: async (_root, { options }: { options: UpdateDailyLogInput }) => {
      return updateDailyLog(options);
    },
  },
};
