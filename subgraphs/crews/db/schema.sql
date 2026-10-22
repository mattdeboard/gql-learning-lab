CREATE TABLE crew_members (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL, -- a project owned by the daily-logs subgraph; no FK across databases
  user_id    TEXT NOT NULL, -- a user owned by the users subgraph
  role       TEXT NOT NULL, -- the person's job on the crew (Foreman, Electrician, ...), not a permissions role
  added_at   TEXT NOT NULL, -- ISO 8601, local time
  UNIQUE (project_id, user_id)
);

CREATE INDEX crew_members_user_id ON crew_members(user_id);
