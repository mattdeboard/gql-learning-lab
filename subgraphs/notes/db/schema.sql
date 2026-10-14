CREATE TABLE notes (
  id           TEXT PRIMARY KEY,
  daily_log_id TEXT NOT NULL, -- a daily log owned by the daily-logs subgraph; no FK across databases
  author_id    TEXT NOT NULL, -- a user owned by the users subgraph; no FK across databases
  body         TEXT NOT NULL,
  created_at   TEXT NOT NULL  -- ISO 8601, local time
);

CREATE INDEX notes_daily_log_id ON notes(daily_log_id);
