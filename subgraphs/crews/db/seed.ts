import type Database from 'better-sqlite3';
import type { World } from '../../../scripts/world.ts';

export function seed(db: Database.Database, world: World): void {
  const insertCrewMember = db.prepare(
    'INSERT INTO crew_members (id, project_id, user_id, role, added_at) VALUES (@id, @project_id, @user_id, @role, @added_at)',
  );
  for (const crewMember of world.crewMembers) insertCrewMember.run(crewMember);
}
