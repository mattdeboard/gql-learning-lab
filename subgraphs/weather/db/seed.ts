import type Database from 'better-sqlite3';
import type { World } from '../../../scripts/world.ts';

export function seed(db: Database.Database, world: World): void {
  const insertObservation = db.prepare(
    'INSERT INTO weather_observations (id, project_id, daily_log_id, observed_at, sky, temp_f, precipitation, wind_mph, is_delay) VALUES (@id, @project_id, @daily_log_id, @observed_at, @sky, @temp_f, @precipitation, @wind_mph, @is_delay)',
  );
  for (const observation of world.weatherObservations) insertObservation.run(observation);
}
