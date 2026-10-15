CREATE TABLE photos (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL, -- a project owned by the daily-logs subgraph; no FK across databases
  daily_log_id TEXT,          -- NULL when the photo isn't attached to a daily log
  url          TEXT NOT NULL,
  caption      TEXT NOT NULL,
  taken_at     TEXT NOT NULL, -- ISO 8601, local time
  uploaded_by  TEXT NOT NULL  -- a user owned by the users subgraph
);

CREATE INDEX photos_daily_log_id ON photos(daily_log_id);
CREATE INDEX photos_project_id ON photos(project_id);
