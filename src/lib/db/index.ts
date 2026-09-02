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

CREATE INDEX IF NOT EXISTS prerequisites_play_id_idx ON prerequisites(play_id);
CREATE INDEX IF NOT EXISTS playbook_events_play_id_idx ON playbook_events(play_id);
`

export function defaultDbPath() {
  return (
    process.env.PLAYBOOK_DB_PATH ??
    path.join(process.cwd(), "data", "playbook.sqlite")
  )
}

export async function ensureSchema(client: Client) {
  await client.executeMultiple(CREATE_SQL)
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
      return opened
    })()
  }
  return (await globalForDb.playbook).db
}
