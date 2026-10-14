CREATE TABLE projects (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  latitude  REAL NOT NULL,
  longitude REAL NOT NULL
);

CREATE TABLE daily_logs (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  date       TEXT NOT NULL, -- YYYY-MM-DD
  status     TEXT NOT NULL CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED')),
  created_by TEXT NOT NULL, -- a user id owned by the users subgraph; no FK across databases
  UNIQUE (project_id, date)
);

CREATE INDEX daily_logs_project_id ON daily_logs(project_id);
