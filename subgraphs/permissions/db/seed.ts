import type Database from 'better-sqlite3';
import type { World } from '../../../scripts/world.ts';

export function seed(db: Database.Database, world: World): void {
  const insertMembership = db.prepare(
    'INSERT INTO project_memberships (user_id, project_id, role) VALUES (@user_id, @project_id, @role)',
  );
  for (const membership of world.projectMemberships) insertMembership.run(membership);

  const insertPermission = db.prepare(
    'INSERT INTO permissions (permission_id, role, project_id, permission_name) VALUES (@permission_id, @role, @project_id, @permission_name)',
  );
  for (const permission of world.rolePermissions) insertPermission.run(permission);
}
