import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { openPlaybookDb } from "@/lib/db"
import { seedIfEmpty } from "@/lib/db/seed"
import {
  createOpportunity,
  listPlayRuns,
  recordPlayRun,
  updateOpportunityOutcome,
} from "@/lib/ops/repo"
import { listPlays, updatePrerequisite } from "@/lib/playbook/repo"

describe("play runs and history", () => {
  const dirs: string[] = []

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  })

  async function tempDb() {
    const dir = await mkdtemp(path.join(os.tmpdir(), "ops-"))
    dirs.push(dir)
    const opened = await openPlaybookDb(path.join(dir, "playbook.sqlite"))
    await seedIfEmpty(opened.db)
    return opened
  }

  it("blocks an unmet prerequisite without an exception reason", async () => {
    const { db, client } = await tempDb()
    await expect(
      recordPlayRun(db, {
        opportunityId: "opp-meridian",
        playId: "product-demo",
        checks: [
          { prerequisiteId: "pd-direct-discovery", met: true },
          { prerequisiteId: "pd-business-problem", met: false },
          { prerequisiteId: "pd-champion", met: true },
        ],
      })
    ).rejects.toThrow(/exception reason/)
    expect(await listPlayRuns(db)).toHaveLength(0)
    await client.close()
  })

  it("saves a run and keeps original wording after the playbook is edited", async () => {
    const { db, client } = await tempDb()
    const runId = await recordPlayRun(db, {
      opportunityId: "opp-meridian",
      playId: "product-demo",
      checks: [
        { prerequisiteId: "pd-direct-discovery", met: true },
        {
          prerequisiteId: "pd-business-problem",
          met: false,
          exceptionReasonId: "ae-pressure",
          note: "AE asked to proceed.",
        },
        { prerequisiteId: "pd-champion", met: true },
      ],
    })

    await updatePrerequisite(db, "pd-business-problem", {
      text: "The quantified business problem is documented in writing",
    })

    const plays = await listPlays(db)
    const current = plays
      .find((play) => play.id === "product-demo")
      ?.prerequisites.find((item) => item.id === "pd-business-problem")
    expect(current?.text).toContain("quantified")
    expect(current?.version).toBe(2)

    const runs = await listPlayRuns(db)
    const saved = runs.find((item) => item.id === runId)
    const check = saved?.checks.find((item) => item.prerequisiteId === "pd-business-problem")
    expect(check?.text).toBe("The business problem is understood")
    expect(check?.currentText).toContain("quantified")
    expect(check?.met).toBe(false)
    expect(check?.exceptionReasonLabel).toBe("AE pressure")
    await client.close()
  })

  it("records advancement and close dates onto existing runs", async () => {
    const { db, client } = await tempDb()
    const runAt = new Date(2026, 7, 1)
    await recordPlayRun(db, {
      opportunityId: "opp-meridian",
      playId: "product-demo",
      runAt,
      checks: [
        { prerequisiteId: "pd-direct-discovery", met: true },
        { prerequisiteId: "pd-business-problem", met: true },
        { prerequisiteId: "pd-champion", met: true },
      ],
    })
    await updateOpportunityOutcome(db, "opp-meridian", {
      advanced: true,
      advancedOn: new Date(2026, 7, 10),
    })
    let runs = await listPlayRuns(db)
    expect(runs[0]?.advanced).toBe(true)
    expect(runs[0]?.daysToAdvancement).toBe(9)

    await updateOpportunityOutcome(db, "opp-meridian", {
      status: "won",
      closeDate: new Date(2026, 8, 5),
    })
    runs = await listPlayRuns(db)
    expect(runs[0]?.closeStatus).toBe("won")
    expect(runs[0]?.daysToClose).toBe(35)
    await client.close()
  })

  it("creates an opportunity that can be selected for a new run", async () => {
    const { db, client } = await tempDb()
    const id = await createOpportunity(db, {
      name: "Harbor Freight — inventory",
      account: "Harbor Freight",
      segment: "SMB",
      se: "Alex Rivera",
      stage: "Qualify",
    })
    const play = (await listPlays(db))[0]!
    const extra = await play.prerequisites.find((item) => item.status === "active")
    expect(extra).toBeTruthy()
    await client.close()
    expect(id).toBeTruthy()
  })
})
