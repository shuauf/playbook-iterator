import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import type { Client } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"

import { schema } from "@/lib/db/schema"
import { bootstrapPlaybook } from "@/lib/db/seed-demo"
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

function env(name: string) {
  const value = process.env[name]
  return value && value.length > 0 ? value : undefined
}

export function isReadOnlyDeployFs() {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.NETLIFY ||
      process.env.LAMBDA_TASK_ROOT
  )
}

export type DbConnection =
  | { kind: "file"; path: string }
  | { kind: "remote"; url: string; authToken?: string }

export function defaultDbPath() {
  const explicit = env("PLAYBOOK_DB_PATH")
  if (explicit) return explicit
  if (isReadOnlyDeployFs()) {
    return path.join(os.tmpdir(), "playbook.sqlite")
  }
  return path.join(process.cwd(), "data", "playbook.sqlite")
}

export function resolveDbConnection(): DbConnection {
  const url = env("PLAYBOOK_DB_URL") ?? env("TURSO_DATABASE_URL") ?? env("LIBSQL_URL")
  if (url && !url.startsWith("file:")) {
    return {
      kind: "remote",
      url,
      authToken:
        env("PLAYBOOK_DB_AUTH_TOKEN") ?? env("TURSO_AUTH_TOKEN") ?? env("LIBSQL_AUTH_TOKEN"),
    }
  }
  return {
    kind: "file",
    path: url?.startsWith("file:") ? url.slice("file:".length) : defaultDbPath(),
  }
}

export function toRemoteLibsqlUrl(url: string) {
  return url.startsWith("libsql://") ? `https://${url.slice("libsql://".length)}` : url
}

export function ensureWritableSqlitePath(filePath: string) {
  const dir = path.dirname(filePath)
  try {
    fs.mkdirSync(dir, { recursive: true })
    return filePath
  } catch {
    const fallback = path.join(os.tmpdir(), path.basename(filePath) || "playbook.sqlite")
    fs.mkdirSync(path.dirname(fallback), { recursive: true })
    return fallback
  }
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
  try {
    await client.executeMultiple(CREATE_SQL)
  } catch {
    for (const sql of CREATE_SQL.split(";").map((item) => item.trim()).filter(Boolean)) {
      await client.execute(sql)
    }
  }
  await backfillPrerequisiteVersions(client)
}

async function createPlaybookClient(connection: DbConnection): Promise<Client> {
  if (connection.kind === "remote") {
    if (!connection.authToken) {
      throw new Error(
        "TURSO_AUTH_TOKEN is required when TURSO_DATABASE_URL (or PLAYBOOK_DB_URL) is set."
      )
    }
    const { createClient } = await import("@libsql/client/web")
    return createClient({
      url: toRemoteLibsqlUrl(connection.url),
      authToken: connection.authToken,
    })
  }
  const { createClient } = await import("@libsql/client")
  const filePath = ensureWritableSqlitePath(connection.path)
  return createClient({ url: `file:${filePath}` })
}

export async function openPlaybookConnection(
  connection: DbConnection = resolveDbConnection()
): Promise<{
  client: Client
  db: PlaybookDb
}> {
  const client = await createPlaybookClient(connection)
  await ensureSchema(client)
  const db = drizzle(client, { schema })
  return { client, db }
}

export async function openPlaybookDb(filePath: string) {
  return openPlaybookConnection({ kind: "file", path: filePath })
}

const globalForDb = globalThis as unknown as {
  playbook?: Promise<{ client: Client; db: PlaybookDb }>
}

export async function getDb(): Promise<PlaybookDb> {
  if (!globalForDb.playbook) {
    globalForDb.playbook = (async () => {
      const opened = await openPlaybookConnection()
      await bootstrapPlaybook(opened.db)
      await backfillPrerequisiteVersions(opened.client)
      return opened
    })()
  }
  return (await globalForDb.playbook).db
}
