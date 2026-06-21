import pg from "pg";

const DRY_RUN = process.argv.includes("--dry-run");
const positional = process.argv.slice(2).filter((a) => !a.startsWith("--"));
// Skip 'migrate' command word when invoked via the binary entrypoint
const urlStart = positional[0] === "migrate" ? 1 : 0;

const OLD_DATABASE_URL = positional[urlStart];
const DATABASE_URL = positional[urlStart + 1];

if (!OLD_DATABASE_URL || !DATABASE_URL) {
  console.error(
    "Usage: migrate <oldDbUrl> <newDbUrl> [--dry-run]"
  );
  process.exit(1);
}

if (DRY_RUN) {
  console.log("[DRY RUN] No changes will be made.\n");
}

const oldDb = new pg.Client({ connectionString: OLD_DATABASE_URL });
const newDb = new pg.Client({ connectionString: DATABASE_URL });

async function migrateInviteTokens() {
  console.log("--- Invite Tokens (TeamAuth.token → Team.inviteToken) ---");

  const { rows } = await oldDb.query<{ slug: string; token: string }>(
    `SELECT t.slug, ta.token FROM "Team" t JOIN "TeamAuth" ta ON t.id = ta."teamId"`
  );
  console.log(`Found ${rows.length} token(s).`);

  let migrated = 0;
  let skipped = 0;

  for (const { slug, token } of rows) {
    const { rowCount } = await newDb.query(`SELECT 1 FROM "Team" WHERE slug = $1`, [slug]);
    if (!rowCount) {
      console.log(`  SKIP: Team "${slug}" not found in new DB.`);
      skipped++;
      continue;
    }
    if (!DRY_RUN) {
      await newDb.query(`UPDATE "Team" SET "inviteToken" = $1 WHERE slug = $2`, [token, slug]);
    }
    console.log(`  ${DRY_RUN ? "WOULD UPDATE" : "UPDATED"}: Team "${slug}"`);
    migrated++;
  }

  console.log(`Invite tokens: ${migrated} migrated, ${skipped} skipped.\n`);
}

async function migrateAdmins() {
  console.log("--- Admins (Owner → Admin) ---");

  const { rows } = await oldDb.query<{ id: string; email: string; fullName: string }>(
    `SELECT id, email, "fullName" FROM "Owner"`
  );
  console.log(`Found ${rows.length} owner(s) to migrate as admins.`);

  let migrated = 0;
  let skipped = 0;

  for (const { id, email, fullName } of rows) {
    const { rowCount } = await newDb.query(`SELECT 1 FROM "Admin" WHERE email = $1`, [email]);
    if (rowCount) {
      console.log(`  SKIP: Admin "${email}" already exists.`);
      skipped++;
      continue;
    }
    if (!DRY_RUN) {
      await newDb.query(
        `INSERT INTO "Admin" (id, email, "fullName") VALUES ($1, $2, $3)`,
        [id, email, fullName]
      );
    }
    console.log(`  ${DRY_RUN ? "WOULD INSERT" : "INSERTED"}: Admin "${email}"`);
    migrated++;
  }

  console.log(`Admins: ${migrated} migrated, ${skipped} skipped.\n`);
}

async function migrateLeaders() {
  console.log("--- Leaders (TeamLeader + team assignments) ---");

  // Old system: one row per (leader, team). Deduplicate by email for the new unique constraint.
  const { rows } = await oldDb.query<{
    id: string;
    email: string;
    fullName: string;
    teamSlug: string;
  }>(
    `SELECT tl.id, tl.email, tl."fullName", t.slug AS "teamSlug"
     FROM "TeamLeader" tl JOIN "Team" t ON tl."teamId" = t.id
     ORDER BY tl.email`
  );
  console.log(`Found ${rows.length} leader-team assignment(s).`);

  // Deduplicate: first occurrence per email defines the leader record
  const leaderMap = new Map<string, { id: string; email: string; fullName: string }>();
  const assignments: { email: string; teamSlug: string }[] = [];

  for (const row of rows) {
    if (!leaderMap.has(row.email)) {
      leaderMap.set(row.email, { id: row.id, email: row.email, fullName: row.fullName });
    }
    assignments.push({ email: row.email, teamSlug: row.teamSlug });
  }

  let leadersMigrated = 0;
  let leadersSkipped = 0;

  for (const { id, email, fullName } of leaderMap.values()) {
    const { rowCount } = await newDb.query(`SELECT 1 FROM "TeamLeader" WHERE email = $1`, [email]);
    if (rowCount) {
      console.log(`  SKIP: Leader "${email}" already exists.`);
      leadersSkipped++;
      continue;
    }
    if (!DRY_RUN) {
      await newDb.query(
        `INSERT INTO "TeamLeader" (id, email, "fullName") VALUES ($1, $2, $3)`,
        [id, email, fullName]
      );
    }
    console.log(`  ${DRY_RUN ? "WOULD INSERT" : "INSERTED"}: Leader "${email}"`);
    leadersMigrated++;
  }

  console.log(`Leaders: ${leadersMigrated} migrated, ${leadersSkipped} skipped.`);

  // Migrate team assignments via Prisma's implicit many-to-many join table _TeamToTeamLeader
  // Columns: A = Team.slug, B = TeamLeader.id
  let assignMigrated = 0;
  let assignSkipped = 0;

  for (const { email, teamSlug } of assignments) {
    const leaderResult = await newDb.query<{ id: string }>(
      `SELECT id FROM "TeamLeader" WHERE email = $1`,
      [email]
    );
    if (!leaderResult.rowCount) {
      console.log(`  SKIP assignment: Leader "${email}" not found in new DB.`);
      assignSkipped++;
      continue;
    }

    const leaderId = leaderResult.rows[0].id;
    const { rowCount } = await newDb.query(
      `SELECT 1 FROM "_TeamToTeamLeader" WHERE "A" = $1 AND "B" = $2`,
      [teamSlug, leaderId]
    );
    if (rowCount) {
      assignSkipped++;
      continue;
    }

    const teamExists = await newDb.query(`SELECT 1 FROM "Team" WHERE slug = $1`, [teamSlug]);
    if (!teamExists.rowCount) {
      console.log(`  SKIP assignment: Team "${teamSlug}" not found in new DB.`);
      assignSkipped++;
      continue;
    }

    if (!DRY_RUN) {
      await newDb.query(
        `INSERT INTO "_TeamToTeamLeader" ("A", "B") VALUES ($1, $2)`,
        [teamSlug, leaderId]
      );
    }
    console.log(`  ${DRY_RUN ? "WOULD ASSIGN" : "ASSIGNED"}: "${email}" → Team "${teamSlug}"`);
    assignMigrated++;
  }

  console.log(`Assignments: ${assignMigrated} migrated, ${assignSkipped} skipped.\n`);
}

async function migrateCredentials() {
  console.log("--- UserCredentials ---");

  const { rows } = await oldDb.query<{ id: string; email: string; passwordHash: string }>(
    `SELECT id, email, "passwordHash" FROM "UserCredentials"`
  );
  console.log(`Found ${rows.length} credential(s).`);

  let migrated = 0;
  let skipped = 0;

  for (const { id, email, passwordHash } of rows) {
    const { rowCount } = await newDb.query(
      `SELECT 1 FROM "UserCredentials" WHERE email = $1`,
      [email]
    );
    if (rowCount) {
      console.log(`  SKIP: Credentials for "${email}" already exist.`);
      skipped++;
      continue;
    }
    if (!DRY_RUN) {
      await newDb.query(
        `INSERT INTO "UserCredentials" (id, email, "passwordHash") VALUES ($1, $2, $3)`,
        [id, email, passwordHash]
      );
    }
    console.log(`  ${DRY_RUN ? "WOULD INSERT" : "INSERTED"}: Credentials for "${email}"`);
    migrated++;
  }

  console.log(`Credentials: ${migrated} migrated, ${skipped} skipped.\n`);
}

try {
  await oldDb.connect();
  await newDb.connect();

  await migrateInviteTokens();
  await migrateAdmins();
  await migrateLeaders();
  await migrateCredentials();

  console.log("Migration complete.");
} catch (error) {
  console.error("Migration failed:", error);
  process.exit(1);
} finally {
  await oldDb.end();
  await newDb.end();
}
