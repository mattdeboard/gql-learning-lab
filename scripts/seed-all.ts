// Wipes and reseeds every scaffolded subgraph's SQLite file from one shared world.
//   npm run seed

import { existsSync, readFileSync, rmSync } from 'node:fs';
import Database from 'better-sqlite3';
import { SUBGRAPHS } from './subgraphs.ts';
import { buildWorld, type World } from './world.ts';

// What every subgraphs/*/db/seed.ts exports.
type SeedModule = { seed: (db: Database.Database, world: World) => void };

const world = buildWorld();

for (const { name } of SUBGRAPHS) {
  const dir = new URL(`../subgraphs/${name}/db/`, import.meta.url);
  const schemaFile = new URL('schema.sql', dir);
  if (!existsSync(schemaFile)) continue; // no tables (auth) or not scaffolded yet

  const dbFile = new URL(`${name}.sqlite`, dir);
  rmSync(dbFile, { force: true });

  const db = new Database(dbFile.pathname);
  db.exec(readFileSync(schemaFile, 'utf8'));

  const { seed } = (await import(new URL('seed.ts', dir).href)) as SeedModule;
  db.transaction(() => seed(db, world))();
  db.close();

  console.log(`seeded ${name}`);
}

// ---------- summary ----------

const projectName = new Map(world.projects.map((project) => [project.id, project.name]));
const userName = new Map(world.users.map((user) => [user.id, user.name]));

console.log('\nProjects');
for (const project of world.projects) {
  const logs = world.dailyLogs.filter((log) => log.project_id === project.id);
  console.log(`  ${project.id}  ${project.name}  (${logs[0]?.id} … ${logs.at(-1)?.id})`);
}

console.log('\nPersonas (use as  Authorization: Bearer <id>)');
for (const { userId, description } of world.personas) {
  console.log(`  ${userId.padEnd(8)} ${userName.get(userId)!.padEnd(17)} ${description}`);
}

console.log('\nProject memberships');
for (const membership of world.projectMemberships) {
  console.log(
    `  ${membership.user_id.padEnd(8)} ${membership.role.padEnd(16)} ${projectName.get(membership.project_id)}`,
  );
}

console.log(
  `\nRows: ${world.dailyLogs.length} daily logs, ${world.weatherObservations.length} weather observations, ` +
    `${world.notes.length} notes, ${world.photos.length} photos, ${world.comments.length} comments, ` +
    `${world.crewMembers.length} crew members`,
);
