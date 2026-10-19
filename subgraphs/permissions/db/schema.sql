CREATE TABLE project_memberships(
  user_id text NOT NULL, -- a user owned by the users subgraph; no FK across databases
  project_id text NOT NULL, -- a project owned by the daily-logs subgraph
  role TEXT NOT NULL CHECK (ROLE IN ('SUPERINTENDENT', 'PROJECT_MANAGER', 'VIEWER')),
  PRIMARY KEY (user_id, project_id)
);

CREATE INDEX project_memberships_project_id ON project_memberships(project_id);

CREATE TABLE permissions(
  permission_id integer PRIMARY KEY,
  role TEXT NOT NULL CHECK (ROLE IN ('SUPERINTENDENT', 'PROJECT_MANAGER', 'VIEWER')),
  project_id text NOT NULL,
  permission_name text NOT NULL,
  UNIQUE (project_id, ROLE, permission_name)
);

CREATE INDEX permission_by_name_idx ON permissions(permission_name);

