// Wipes and reseeds subgraph SQLite files from one shared world.
//   npm run seed                      # every scaffolded subgraph
//   npm run seed -- photos comments   # only these; the other databases are left alone

import { existsSync, readFileSync, rmSync } from 'node:fs';
import Database from 'better-sqlite3';
import { SUBGRAPHS } from './subgraphs.ts';
import { buildWorld, type World } from './world.ts';

// What every subgraphs/*/db/seed.ts exports.
type SeedModule = { seed: (db: Database.Database, world: World) => void };

const world = buildWorld();

// Subgraph names given on the command line, or all of them.
const requested = process.argv.slice(2);
const unknown = requested.filter((name) => !SUBGRAPHS.some((subgraph) => subgraph.name === name));
if (unknown.length > 0) {
  console.error(`Unknown subgraph: ${unknown.join(', ')}. Known: ${SUBGRAPHS.map((s) => s.name).join(', ')}`);
  process.exit(1);
}
const toSeed = requested.length > 0 ? SUBGRAPHS.filter(({ name }) => requested.includes(name)) : SUBGRAPHS;

for (const { name } of toSeed) {
  const dir = new URL(`../subgraphs/${name}/db/`, import.meta.url);
  const schemaFile = new URL('schema.sql', dir);
  if (!existsSync(schemaFile)) {
    // No tables (auth) or not scaffolded yet. Only worth mentioning if it was asked for by name.
    if (requested.includes(name)) console.log(`skipped ${name}: no db/schema.sql`);
    continue;
  }

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
