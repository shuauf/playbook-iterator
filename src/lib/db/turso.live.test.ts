import { describe, expect, it } from "vitest"

import { openPlaybookConnection, resolveDbConnection } from "@/lib/db"
import { bootstrapPlaybook } from "@/lib/db/seed-demo"
import { plays } from "@/lib/db/schema"
import { playRuns } from "@/lib/db/schema"

const live = Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN)

describe.skipIf(!live)("Turso live connection", () => {
  it(
    "connects over HTTP, applies schema, and can read plays",
    async () => {
      expect(resolveDbConnection().kind).toBe("remote")
      const { db, client } = await openPlaybookConnection()
      try {
        await bootstrapPlaybook(db)
        const playRows = await db.select({ id: plays.id, name: plays.name }).from(plays)
        expect(playRows.length).toBeGreaterThan(0)
        expect(playRows.some((row) => row.id === "product-demo")).toBe(true)
        const runRows = await db.select({ id: playRuns.id }).from(playRuns).limit(1)
        expect(runRows.length).toBeGreaterThan(0)
      } finally {
        client.close()
      }
    },
    120_000
  )
})
