import type { Resolvers } from '@lab/shared/resolvers';
import {
  createDailyLog,
  type CreateDailyLogInput,
  type DailyLogEntity,
  type DailyLogQueryInput,
  deleteDailyLog,
  getDailyLogsBy,
  getLogsForUser,
  getProjectById,
  updateDailyLog,
  type UpdateDailyLogInput,
} from './data.ts';

export const resolvers: Resolvers = {
  DailyLog: {
    createdBy: (log: DailyLogEntity) => {
      return { id: log.createdBy };
    },
    project: (log: DailyLogEntity) => {
      return getProjectById(log.projectId);
    },
  },
  Query: {
    dailyLogsBy: async (_root, { filters }: { filters: DailyLogQueryInput }) => {
      return getDailyLogsBy(filters);
    },
    dailyLogsForCurrentUser: async (_root, _args, { userId }) => {
      if (!userId) return null;
      return getLogsForUser(userId);
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
