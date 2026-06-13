import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "../lib/db";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "../../../../");
const migrationsDir = path.join(repoRoot, "supabase", "migrations");
const seedPath = path.join(repoRoot, "supabase", "seed.sql");

async function run() {
  const seedSql = readFileSync(seedPath, "utf8");
  const migrationFiles = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  await sql`
    create table if not exists public.schema_migrations (
      id uuid primary key default gen_random_uuid(),
      filename text not null unique,
      applied_at timestamptz not null default now()
    )
  `;

  const hasUsersTable = await sql<{ exists: boolean }[]>`
    select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = 'users'
    ) as exists
  `;

  if (hasUsersTable[0]?.exists) {
    await sql`
      insert into public.schema_migrations (filename)
      values ('0001_initial_schema.sql')
      on conflict (filename) do nothing
    `;
  }

  const appliedRows = await sql<{ filename: string }[]>`
    select filename
    from public.schema_migrations
  `;
  const applied = new Set(appliedRows.map((row) => row.filename));

  for (const file of migrationFiles) {
    if (applied.has(file)) {
      continue;
    }

    const migrationSql = readFileSync(path.join(migrationsDir, file), "utf8");
    await sql.unsafe(migrationSql);
    await sql`
      insert into public.schema_migrations (filename)
      values (${file})
      on conflict (filename) do nothing
    `;
  }

  await sql.unsafe(seedSql);
  await sql.end();

  console.log("Schema and seed applied.");
}

run().catch(async (error) => {
  console.error(error);
  await sql.end({ timeout: 1 });
  process.exit(1);
});
