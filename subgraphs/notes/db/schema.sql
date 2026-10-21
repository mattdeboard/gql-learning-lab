CREATE TABLE notes (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL, -- copied from the daily log when the note is created; the authorization scope
  daily_log_id TEXT NOT NULL, -- a daily log owned by the daily-logs subgraph; no FK across databases
  author_id    TEXT NOT NULL, -- a user owned by the users subgraph; no FK across databases
  body         TEXT NOT NULL,
  created_at   TEXT NOT NULL  -- ISO 8601, local time
);

CREATE INDEX notes_daily_log_id ON notes(daily_log_id);
CREATE INDEX notes_project_id ON notes(project_id);
