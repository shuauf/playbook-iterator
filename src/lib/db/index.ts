import fs from "node:fs"
import path from "node:path"

import { createClient, type Client } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"

import { schema } from "@/lib/db/schema"
import { seedIfEmpty } from "@/lib/db/seed"
import type { PlaybookDb } from "@/lib/db/types"

export type { PlaybookDb } from "@/lib/db/types"

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS plays (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  typical_stage TEXT NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL,
  definition_version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  retired_at INTEGER
);

CREATE TABLE IF NOT EXISTS prerequisites (
  id TEXT PRIMARY KEY,
  play_id TEXT NOT NULL REFERENCES plays(id),
  text TEXT NOT NULL,
  intent TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  retired_at INTEGER
);

CREATE TABLE IF NOT EXISTS prerequisite_versions (
  id TEXT PRIMARY KEY,
  prerequisite_id TEXT NOT NULL REFERENCES prerequisites(id),
  text TEXT NOT NULL,
  intent TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  version INTEGER NOT NULL,
  is_current INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  superseded_at INTEGER
);

CREATE TABLE IF NOT EXISTS exception_reasons (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  retired_at INTEGER
);

CREATE TABLE IF NOT EXISTS playbook_events (
  id TEXT PRIMARY KEY,
  play_id TEXT REFERENCES plays(id),
  summary TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  account TEXT NOT NULL,
  segment TEXT NOT NULL,
  se TEXT NOT NULL,
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  advanced INTEGER,
  advanced_on INTEGER,
  close_date INTEGER
);

CREATE TABLE IF NOT EXISTS play_runs (
  id TEXT PRIMARY KEY,
  external_id TEXT NOT NULL,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id),
  play_id TEXT NOT NULL REFERENCES plays(id),
  play_name TEXT NOT NULL,
  typical_stage TEXT NOT NULL,
  definition_version INTEGER NOT NULL,
  stage_at_run TEXT NOT NULL,
  run_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS prerequisite_checks (
  id TEXT PRIMARY KEY,
  play_run_id TEXT NOT NULL REFERENCES play_runs(id),
  prerequisite_id TEXT NOT NULL REFERENCES prerequisites(id),
  prerequisite_version_id TEXT NOT NULL REFERENCES prerequisite_versions(id),
  text TEXT NOT NULL,
  intent TEXT NOT NULL,
  met INTEGER NOT NULL,
  exception_reason_id TEXT,
  exception_reason_label TEXT,
  note TEXT,
  approver TEXT
);

CREATE INDEX IF NOT EXISTS prerequisites_play_id_idx ON prerequisites(play_id);
CREATE INDEX IF NOT EXISTS playbook_events_play_id_idx ON playbook_events(play_id);
CREATE UNIQUE INDEX IF NOT EXISTS prereq_version_unique ON prerequisite_versions(prerequisite_id, version);
CREATE INDEX IF NOT EXISTS prereq_versions_prereq_idx ON prerequisite_versions(prerequisite_id);
CREATE UNIQUE INDEX IF NOT EXISTS opportunities_external_id_idx ON opportunities(external_id);
CREATE UNIQUE INDEX IF NOT EXISTS play_runs_external_id_idx ON play_runs(external_id);
CREATE INDEX IF NOT EXISTS play_runs_opportunity_idx ON play_runs(opportunity_id);
CREATE INDEX IF NOT EXISTS play_runs_play_idx ON play_runs(play_id);
CREATE INDEX IF NOT EXISTS prerequisite_checks_run_idx ON prerequisite_checks(play_run_id);
`

export function defaultDbPath() {
  return (
    process.env.PLAYBOOK_DB_PATH ??
    path.join(process.cwd(), "data", "playbook.sqlite")
  )
}

export async function backfillPrerequisiteVersions(client: Client) {
  const missing = await client.execute(`
    SELECT p.id, p.text, p.intent, p.sort_order, p.created_at
    FROM prerequisites p
    WHERE NOT EXISTS (
      SELECT 1 FROM prerequisite_versions v WHERE v.prerequisite_id = p.id
    )
  `)

  for (const row of missing.rows) {
    await client.execute({
      sql: `INSERT INTO prerequisite_versions (
        id, prerequisite_id, text, intent, sort_order, version, is_current, created_at
      ) VALUES (?, ?, ?, ?, ?, 1, 1, ?)`,
      args: [
        `${String(row.id)}-v1`,
        String(row.id),
        String(row.text),
        String(row.intent),
        Number(row.sort_order),
        Number(row.created_at),
      ],
    })
  }
}

export async function ensureSchema(client: Client) {
  await client.executeMultiple(CREATE_SQL)
  await backfillPrerequisiteVersions(client)
}

export async function openPlaybookDb(filePath: string): Promise<{
  client: Client
  db: PlaybookDb
}> {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const client = createClient({ url: `file:${filePath}` })
  await ensureSchema(client)
  const db = drizzle(client, { schema })
  return { client, db }
}

const globalForDb = globalThis as unknown as {
  playbook?: Promise<{ client: Client; db: PlaybookDb }>
}

export async function getDb(): Promise<PlaybookDb> {
  if (!globalForDb.playbook) {
    globalForDb.playbook = (async () => {
      const opened = await openPlaybookDb(defaultDbPath())
      await seedIfEmpty(opened.db)
      await backfillPrerequisiteVersions(opened.client)
      return opened
    })()
  }
  return (await globalForDb.playbook).db
}
