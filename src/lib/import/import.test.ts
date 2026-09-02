import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { openPlaybookDb } from "@/lib/db"
import { seedIfEmpty } from "@/lib/db/seed"
import { commitPreview, previewCsv, TINY_OPPORTUNITIES_CSV } from "@/lib/import/csv"
import { listOpportunities } from "@/lib/ops/repo"

describe("CSV import", () => {
  const dirs: string[] = []

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  })

  async function tempDb() {
    const dir = await mkdtemp(path.join(os.tmpdir(), "import-"))
    dirs.push(dir)
    const opened = await openPlaybookDb(path.join(dir, "playbook.sqlite"))
    await seedIfEmpty(opened.db)
    return opened
  }

  it("previews new, update, invalid, and duplicate rows without saving", async () => {
    const { db, client } = await tempDb()
    const before = await listOpportunities(db)
    const preview = await previewCsv(db, "opportunities", TINY_OPPORTUNITIES_CSV)

    expect(preview.rows.some((row) => row.status === "new" && row.externalId === "opp-new")).toBe(true)
    expect(preview.rows.some((row) => row.status === "update" && row.externalId === "opp-meridian")).toBe(true)
    expect(preview.rows.some((row) => row.status === "error" && row.externalId === "opp-bad")).toBe(true)
    expect(preview.rows.filter((row) => row.externalId === "opp-dup" && row.status === "duplicate")).toHaveLength(2)
    expect(preview.canCommit).toBe(false)

    await expect(commitPreview(db, preview)).rejects.toThrow(/Nothing was saved/)
    const after = await listOpportunities(db)
    expect(after).toHaveLength(before.length)
    expect(after.find((item) => item.externalId === "opp-new")).toBeUndefined()
    expect(after.find((item) => item.externalId === "opp-meridian")?.name).not.toContain("updated")
    await client.close()
  })

  it("commits a clean file and upserts by external id", async () => {
    const { db, client } = await tempDb()
    const csv = `external_id,name,account,segment,se,stage,status,created_at,advanced,advanced_on,close_date
opp-new,New Co — expansion,New Co,SMB,Maya Chen,Evaluate,open,2026-07-01,,,
opp-meridian,Meridian Health — platform expansion (updated),Meridian Health,Enterprise,Maya Chen,Evaluate,open,2026-05-12,,,
`
    const preview = await previewCsv(db, "opportunities", csv)
    expect(preview.canCommit).toBe(true)
    expect(preview.newCount).toBe(1)
    expect(preview.updateCount).toBe(1)
    await commitPreview(db, preview)
    const after = await listOpportunities(db)
    expect(after.find((item) => item.externalId === "opp-new")?.name).toContain("New Co")
    expect(after.find((item) => item.externalId === "opp-meridian")?.name).toContain("updated")
    await client.close()
  })
})
