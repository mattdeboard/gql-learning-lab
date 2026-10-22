CREATE TABLE weather_observations (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL,    -- copied from the daily log at creation; the authorization scope for writes
  daily_log_id  TEXT NOT NULL,    -- a daily log owned by the daily-logs subgraph; no FK across databases
  observed_at   TEXT NOT NULL,    -- ISO 8601, local time
  sky           TEXT NOT NULL CHECK (sky IN ('CLEAR', 'PARTLY_CLOUDY', 'OVERCAST', 'RAIN')),
  temp_f        INTEGER NOT NULL,
  precipitation REAL NOT NULL,    -- inches
  wind_mph      INTEGER NOT NULL,
  is_delay      INTEGER NOT NULL CHECK (is_delay IN (0, 1)) -- did weather delay work?
);

CREATE INDEX weather_observations_daily_log_id ON weather_observations(daily_log_id);
CREATE INDEX weather_observations_project_id ON weather_observations(project_id);
