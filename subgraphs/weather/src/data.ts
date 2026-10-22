import { fileURLToPath } from 'node:url';
import { openDb } from '@lab/shared/db';

const connection = openDb('weather', fileURLToPath(new URL('../db/weather.sqlite', import.meta.url)));

export type Sky = 'CLEAR' | 'PARTLY_CLOUDY' | 'OVERCAST' | 'RAIN';

export interface WeatherObservationEntity {
  id: string;
  projectId: string; // copied from the daily log at creation; the authorization scope for writes
  dailyLogId: string; // a daily log owned by the daily-logs subgraph
  observedAt: string;
  sky: Sky;
  tempF: number;
  precipitation: number; // inches
  windMph: number;
  isDelay: 0 | 1; // SQLite has no boolean; 1 = weather delayed work
}

export const getObservationTable = () => connection<WeatherObservationEntity>('weather_observations');

export async function getObservationById(id: string) {
  return await getObservationTable().where({ id }).first();
}

export async function getObservationsByDailyLogId(dailyLogId: string) {
  return await getObservationTable().select().where({ dailyLogId }).orderBy('observedAt');
}

// Observations for many daily logs in one query, all mixed together in a single array.
// Grouping them back by dailyLogId is up to the caller.
export async function getObservationsByDailyLogIds(dailyLogIds: readonly string[]) {
  return await getObservationTable().select().whereIn('dailyLogId', dailyLogIds).orderBy('observedAt');
}
