CREATE TABLE comments (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL, -- copied from the photo when the comment is created; the authorization scope
  photo_id   TEXT NOT NULL, -- a photo owned by the photos subgraph; no FK across databases
  author_id  TEXT NOT NULL, -- a user owned by the users subgraph
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL  -- ISO 8601, local time
);

CREATE INDEX comments_photo_id ON comments(photo_id);
CREATE INDEX comments_project_id ON comments(project_id);
