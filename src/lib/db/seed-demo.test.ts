import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { analyze, evidenceForFinding, toAnalysisInput } from "@/analysis/engine"
import { findingByPrereq } from "@/analysis/planted"
import { openPlaybookDb } from "@/lib/db"
import { bootstrapPlaybook } from "@/lib/db/seed-demo"
import { seedIfEmpty } from "@/lib/db/seed"
import { loadAnalysisRecords } from "@/lib/ops/repo"
import { listPlays } from "@/lib/playbook/repo"

describe("demo bootstrap", () => {
  const dirs: string[] = []

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  })

  async function tempDb() {
    const dir = await mkdtemp(path.join(os.tmpdir(), "demo-"))
    dirs.push(dir)
    return openPlaybookDb(path.join(dir, "playbook.sqlite"))
  }

  it("loads the planted dataset when the database has no play runs", async () => {
    const { db, client } = await tempDb()
    const first = await bootstrapPlaybook(db)
    expect(first.demoLoaded).toBe(true)
    const plays = await listPlays(db)
    expect(plays.map((play) => play.id)).toEqual(
      expect.arrayContaining(["product-demo", "custom-demo", "discovery", "proof-of-concept"])
    )
    const records = await loadAnalysisRecords(db)
    expect(records.runs.length).toBeGreaterThan(100)
    const result = analyze(toAnalysisInput(records))
    const finding = findingByPrereq(result, "product-demo", "pd-business-problem")
    expect(finding?.recommendation).toBe("enforce")
    expect(evidenceForFinding(finding!, toAnalysisInput(records)).length).toBeGreaterThan(0)
    await client.close()
  })

  it("does not reload demo data when runs already exist", async () => {
    const { db, client } = await tempDb()
    await bootstrapPlaybook(db)
    const before = (await loadAnalysisRecords(db)).runs.length
    const second = await bootstrapPlaybook(db)
    expect(second.demoLoaded).toBe(false)
    expect((await loadAnalysisRecords(db)).runs.length).toBe(before)
    await client.close()
  })

  it("leaves seedIfEmpty as a thin catalog when demo bootstrap is skipped", async () => {
    const { db, client } = await tempDb()
    await seedIfEmpty(db)
    const plays = await listPlays(db)
    expect(plays).toHaveLength(1)
    expect(plays[0]?.name).toBe("Product Demo")
    await client.close()
  })
})
