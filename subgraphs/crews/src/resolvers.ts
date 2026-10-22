import type { Resolvers } from '@lab/shared/resolvers';
import type { CrewsContext } from './context.ts';
import type { CrewMemberEntity } from './data.ts';

// TODO(matt)
export const resolvers: Resolvers<Record<'CrewMember', { id: string }>, CrewsContext> = {
  CrewMember: {
    dailyLog: (obj: CrewMemberEntity) => ({ id: obj.dailyLogId }),
    user: (obj: CrewMemberEntity) => ({ id: obj.userId }),
  },
  User: {
    crewDays: async ({ id }: { id: string }, _args, { crewDaysByUserIdLoader }) => {
      const rows = await crewDaysByUserIdLoader.load(id);
      return rows.map((r) => ({ id: r.dailyLogId }));
    },
  },
  DailyLog: {
    crew: async (obj: { id: string }, _args, { crewMembersByLogIdLoader }) => {
      return crewMembersByLogIdLoader.load(obj.id);
    },
  },
};
