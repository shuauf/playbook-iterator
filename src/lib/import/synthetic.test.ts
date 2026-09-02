import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { analyze, toAnalysisInput } from "@/analysis/engine"
import { findingByPrereq } from "@/analysis/planted"
import { openPlaybookDb } from "@/lib/db"
import { seedIfEmpty } from "@/lib/db/seed"
import { loadSyntheticDataset } from "@/lib/import/load-synthetic"
import { loadAnalysisRecords } from "@/lib/ops/repo"
import { ensureCanonicalPlays } from "@/lib/playbook/catalog-sync"

describe("synthetic dataset", () => {
  const dirs: string[] = []

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  })

  it("loads planted records and reproduces the review labels", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "syn-"))
    dirs.push(dir)
    const { db, client } = await openPlaybookDb(path.join(dir, "playbook.sqlite"))
    await seedIfEmpty(db)
    await ensureCanonicalPlays(db)
    const loaded = await loadSyntheticDataset(db)
    expect(loaded.playRuns).toBeGreaterThan(100)

    const records = await loadAnalysisRecords(db)
    const result = analyze(toAnalysisInput(records))
    expect(findingByPrereq(result, "product-demo", "pd-business-problem")?.recommendation).toBe("enforce")
    expect(findingByPrereq(result, "product-demo", "pd-champion")?.recommendation).toBe("retire")
    expect(findingByPrereq(result, "custom-demo", "cd-env")?.recommendation).toBe("investigate")
    await client.close()
  })
})
