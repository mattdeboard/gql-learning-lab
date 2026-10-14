// Builds the entire seed dataset in memory, deterministically.
//
// This is the only code in the repo that knows about every domain at once.
// Each subgraph's db/seed.ts takes the world and writes just its own tables,
// which keeps IDs consistent across the separate SQLite files (a comment's
// photo_id points at a real photo, a crew member's user_id at a real user...).

// ---------- row types (one per table) ----------

export type User = { id: string; name: string; email: string; trade: string };
export type Role = 'SUPERINTENDENT' | 'PROJECT_MANAGER' | 'VIEWER';
export type ProjectMembership = { user_id: string; project_id: string; role: Role };
export type Project = { id: string; name: string; latitude: number; longitude: number };
export type DailyLogStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED';
export type DailyLog = {
  id: string;
  project_id: string;
  date: string;
  status: DailyLogStatus;
  created_by: string;
};
export type WeatherObservation = {
  id: string;
  daily_log_id: string;
  observed_at: string;
  sky: string;
  temp_f: number;
  precipitation: number;
  wind_mph: number;
  is_delay: 0 | 1;
};
export type CrewMember = {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  added_at: string;
};
export type Note = {
  id: string;
  daily_log_id: string;
  author_id: string;
  body: string;
  created_at: string;
};
export type Photo = {
  id: string;
  project_id: string;
  daily_log_id: string | null;
  url: string;
  caption: string;
  taken_at: string;
  uploaded_by: string;
};
export type Comment = {
  id: string;
  photo_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

export type World = {
  users: User[];
  projectMemberships: ProjectMembership[];
  projects: Project[];
  dailyLogs: DailyLog[];
  weatherObservations: WeatherObservation[];
  crewMembers: CrewMember[];
  notes: Note[];
  photos: Photo[];
  comments: Comment[];
  // Not a table. Used only by seed-all.ts to print the persona summary.
  personas: { userId: string; description: string }[];
};

// ---------- deterministic randomness ----------

// mulberry32: a tiny seeded PRNG. Same seed, same world, every time.
function createRandom(seed: number) {
  let state = seed;
  const next = (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));
  const pick = <T>(items: readonly T[]): T => items[int(0, items.length - 1)]!;
  return { next, int, pick };
}

// ---------- fixed cast ----------

const USERS: User[] = [
  { id: 'user-1', name: 'Dana Whitfield', email: 'dana@example.com', trade: 'General Contractor' },
  { id: 'user-2', name: 'Marco Reyes', email: 'marco@example.com', trade: 'General Contractor' },
  { id: 'user-3', name: 'Priya Natarajan', email: 'priya@example.com', trade: 'Project Management' },
  { id: 'user-4', name: 'Tom Okafor', email: 'tom@example.com', trade: "Owner's Representative" },
  { id: 'user-5', name: 'Luis Ortega', email: 'luis@example.com', trade: 'Concrete' },
  { id: 'user-6', name: 'Hannah Berg', email: 'hannah@example.com', trade: 'Electrical' },
  { id: 'user-7', name: 'Kofi Mensah', email: 'kofi@example.com', trade: 'Framing' },
  { id: 'user-8', name: 'Rosa Delgado', email: 'rosa@example.com', trade: 'Plumbing' },
  { id: 'user-9', name: 'Grant Feld', email: 'grant@example.com', trade: 'Structural Engineering' },
  { id: 'user-10', name: 'Ivy Chen', email: 'ivy@example.com', trade: 'HVAC' },
];

const PROJECTS: Project[] = [
  { id: 'project-1', name: 'Riverside Medical Office', latitude: 45.5231, longitude: -122.6765 }, // Portland, OR
  { id: 'project-2', name: 'Desert Ridge Elementary', latitude: 33.6846, longitude: -111.9727 }, // Phoenix, AZ
];

const MEMBERSHIPS: ProjectMembership[] = [
  { user_id: 'user-1', project_id: 'project-1', role: 'SUPERINTENDENT' },
  { user_id: 'user-2', project_id: 'project-2', role: 'SUPERINTENDENT' },
  { user_id: 'user-3', project_id: 'project-1', role: 'PROJECT_MANAGER' },
  { user_id: 'user-3', project_id: 'project-2', role: 'PROJECT_MANAGER' },
  { user_id: 'user-4', project_id: 'project-1', role: 'VIEWER' },
  // user-9 used to be a VIEWER on project-1. That row has been removed,
  // but their comments on project-1 photos remain.
];

// Crew members are users with NO project_memberships rows.
const CREW: { project_id: string; user_id: string; role: string }[] = [
  { project_id: 'project-1', user_id: 'user-5', role: 'Foreman' },
  { project_id: 'project-1', user_id: 'user-6', role: 'Electrician' },
  { project_id: 'project-2', user_id: 'user-7', role: 'Foreman' },
  { project_id: 'project-2', user_id: 'user-8', role: 'Plumber' },
];

const SUPE_BY_PROJECT: Record<string, string> = { 'project-1': 'user-1', 'project-2': 'user-2' };
const LOST_ACCESS_USER = 'user-9';
const LOST_ACCESS_PROJECT = 'project-1';

// Who writes notes / uploads photos / comments, per project.
const NOTE_AUTHORS: Record<string, string[]> = {
  'project-1': ['user-1', 'user-3', 'user-4'],
  'project-2': ['user-2', 'user-3'],
};
const UPLOADERS: Record<string, string[]> = {
  'project-1': ['user-1', 'user-3', 'user-5', 'user-6'],
  'project-2': ['user-2', 'user-3', 'user-7', 'user-8'],
};
const COMMENTERS: Record<string, string[]> = {
  'project-1': ['user-1', 'user-3', 'user-4', 'user-5', 'user-6', LOST_ACCESS_USER],
  'project-2': ['user-2', 'user-3', 'user-7', 'user-8'],
};

const WEEK = [
  '2026-10-05',
  '2026-10-06',
  '2026-10-07',
  '2026-10-08',
  '2026-10-09',
  '2026-10-10',
  '2026-10-11',
];

// Typical conditions per project: [min temp, max temp, chance of rain]
const CLIMATE: Record<string, [number, number, number]> = {
  'project-1': [48, 64, 0.45],
  'project-2': [78, 96, 0.05],
};

const NOTE_BODIES = [
  'Concrete pour for level 2 slab completed by 11am. Cylinders taken.',
  'Electrical rough-in inspection passed on east wing.',
  'Delivery of rebar delayed until tomorrow morning.',
  'Safety stand-down held at 7am re: fall protection.',
  'Framing crew short two people today.',
  'Owner walkthrough scheduled for Friday 2pm.',
  'Crane down for maintenance 1pm–3pm.',
  'Waterproofing at foundation wall 80% complete.',
  'RFI submitted regarding duct routing above corridor ceiling.',
  'Site cleanup completed; dumpster swapped.',
];
const CAPTIONS = [
  'Level 2 slab after pour',
  'Rebar layout, grid C-4',
  'East wing electrical rough-in',
  'Foundation waterproofing progress',
  'Stair core formwork',
  'Roof drain installation',
  'Storefront framing',
  'Underground plumbing before backfill',
  'Crane pick of RTU',
  'Site logistics, north gate',
  'Fireproofing at steel columns',
  'Drywall hang, room 214',
];
const COMMENT_BODIES = [
  'Looks good.',
  'Can we get a closer shot of the corner?',
  'Is this before or after inspection?',
  'Flagging for the weekly report.',
  'This matches the revised drawings.',
  'Please confirm embed locations.',
  'Nice progress!',
  'Who signed off on this?',
];
const SKIES = ['CLEAR', 'PARTLY_CLOUDY', 'OVERCAST'];

// ---------- build ----------

export function buildWorld(): World {
  const random = createRandom(20261005);

  const dailyLogs: DailyLog[] = [];
  const weatherObservations: WeatherObservation[] = [];
  const notes: Note[] = [];
  const photos: Photo[] = [];
  const comments: Comment[] = [];

  const nextId = { log: 1, weather: 1, note: 1, photo: 1, comment: 1 };
  const time = (date: string, hour: number, minute: number) =>
    `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;

  const addPhoto = (projectId: string, dailyLogId: string | null, date: string) => {
    const photoId = `photo-${nextId.photo++}`;
    photos.push({
      id: photoId,
      project_id: projectId,
      daily_log_id: dailyLogId,
      url: `https://picsum.photos/seed/${photoId}/1024/768`,
      caption: random.pick(CAPTIONS),
      taken_at: time(date, random.int(7, 16), random.int(0, 59)),
      uploaded_by: random.pick(UPLOADERS[projectId]!),
    });

    const commentCount = random.int(0, 6);
    for (let c = 0; c < commentCount; c++) {
      comments.push({
        id: `comment-${nextId.comment++}`,
        photo_id: photoId,
        author_id: random.pick(COMMENTERS[projectId]!),
        body: random.pick(COMMENT_BODIES),
        created_at: time(date, 17, random.int(0, 59)),
      });
    }
    return photoId;
  };

  for (const project of PROJECTS) {
    const [minTemp, maxTemp, rainChance] = CLIMATE[project.id]!;

    WEEK.forEach((date, dayIndex) => {
      const logId = `log-${nextId.log++}`;
      dailyLogs.push({
        id: logId,
        project_id: project.id,
        date,
        // The last two days of the week aren't approved yet.
        status: dayIndex < 5 ? 'APPROVED' : dayIndex === 5 ? 'SUBMITTED' : 'DRAFT',
        created_by: SUPE_BY_PROJECT[project.id]!,
      });

      const observationCount = random.int(1, 3);
      for (let w = 0; w < observationCount; w++) {
        const raining = random.next() < rainChance;
        const windMph = random.int(0, 30);
        weatherObservations.push({
          id: `weather-${nextId.weather++}`,
          daily_log_id: logId,
          observed_at: time(date, 7 + w * 4, 0),
          sky: raining ? 'RAIN' : random.pick(SKIES),
          temp_f: random.int(minTemp, maxTemp),
          precipitation: raining ? Math.round(random.next() * 50) / 100 : 0,
          wind_mph: windMph,
          is_delay: raining && windMph > 20 ? 1 : 0,
        });
      }

      const noteCount = random.int(2, 5);
      for (let n = 0; n < noteCount; n++) {
        notes.push({
          id: `note-${nextId.note++}`,
          daily_log_id: logId,
          author_id: random.pick(NOTE_AUTHORS[project.id]!),
          body: random.pick(NOTE_BODIES),
          created_at: time(date, random.int(7, 17), random.int(0, 59)),
        });
      }

      const photoCount = random.int(15, 25);
      for (let p = 0; p < photoCount; p++) {
        const photoId = addPhoto(project.id, logId, date);

        // Guarantee the lost-access persona shows up on every project-1 log.
        if (project.id === LOST_ACCESS_PROJECT && p === 0) {
          comments.push({
            id: `comment-${nextId.comment++}`,
            photo_id: photoId,
            author_id: LOST_ACCESS_USER,
            body: 'Structural sign-off on this area is attached to the RFI.',
            created_at: time(date, 17, 30),
          });
        }
      }
    });

    // A few photos per project that aren't attached to any daily log.
    for (let p = 0; p < 5; p++) {
      addPhoto(project.id, null, WEEK[random.int(0, WEEK.length - 1)]!);
    }
  }

  const crewMembers: CrewMember[] = CREW.map((crew, index) => ({
    id: `crew-${index + 1}`,
    ...crew,
    added_at: '2026-10-12T08:00:00',
  }));

  const personas = [
    { userId: 'user-1', description: 'Author: SUPERINTENDENT on project-1' },
    { userId: 'user-2', description: 'Author: SUPERINTENDENT on project-2' },
    { userId: 'user-3', description: 'PROJECT_MANAGER on project-1 and project-2' },
    { userId: 'user-4', description: 'VIEWER on project-1 (also writes notes and comments)' },
    { userId: 'user-5', description: 'Crew on project-1, no permissions' },
    { userId: 'user-6', description: 'Crew on project-1, no permissions' },
    { userId: 'user-7', description: 'Crew on project-2, no permissions' },
    { userId: 'user-8', description: 'Crew on project-2, no permissions' },
    { userId: 'user-9', description: 'Comment author who LOST access to project-1, no memberships' },
    { userId: 'user-10', description: 'Outsider: no memberships, not on any crew, no comments' },
  ];

  return {
    users: USERS,
    projectMemberships: MEMBERSHIPS,
    projects: PROJECTS,
    dailyLogs,
    weatherObservations,
    crewMembers,
    notes,
    photos,
    comments,
    personas,
  };
}
