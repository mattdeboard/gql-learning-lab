-- A daily log's crew: who was on site that day, and in what job.
-- Crews change day to day, so there is no standing "crew" entity.
CREATE TABLE crew_members (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL, -- the log's project; the authorization scope
  daily_log_id TEXT NOT NULL, -- a daily log owned by the daily-logs subgraph; no FK across databases
  user_id      TEXT NOT NULL, -- a user owned by the users subgraph
  role         TEXT NOT NULL, -- the person's job that day (Foreman, Electrician, ...), not a permissions role
  UNIQUE (daily_log_id, user_id)
);

CREATE INDEX crew_members_daily_log_id ON crew_members(daily_log_id);
CREATE INDEX crew_members_project_id ON crew_members(project_id);
CREATE INDEX crew_members_user_id ON crew_members(user_id);
