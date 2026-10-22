import type { Resolvers } from '@lab/shared/resolvers';
import type { WeatherContext } from './context.ts';
import type { WeatherObservationEntity } from './data.ts';
import { forecastFor } from './fakeForecast.ts';

type ForecastParams = {
  date: string;
  project: { latitude: number; longitude: number };
};
export const resolvers: Resolvers<
  Record<'DailyLog' | 'WeatherObservation', { id: string }>,
  WeatherContext
> = {
  WeatherObservation: {
    dailyLog: (obs: WeatherObservationEntity) => {
      return { id: obs.dailyLogId };
    },
    __resolveReference: async ({ id }, { weatherByIdLoader }) => weatherByIdLoader.load(id),
  },
  DailyLog: {
    forecast: async ({ date, project: { latitude, longitude } }: ForecastParams) =>
      forecastFor(latitude, longitude, date),
    weatherObservations: async (obj: { id: string }, _args, { weatherByDailyLogLoader }) => {
      return weatherByDailyLogLoader.load(obj.id);
    },
  },
};
