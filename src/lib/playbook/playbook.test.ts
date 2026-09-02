import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { openPlaybookDb } from "@/lib/db"
import { seedIfEmpty } from "@/lib/db/seed"
import {
  addPrerequisite,
  createPlay,
  listPlays,
  reorderPrerequisite,
  setPrerequisiteStatus,
  updatePlay,
} from "@/lib/playbook/repo"

describe("playbook persistence", () => {
  const dirs: string[] = []

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  })

  async function tempDb() {
    const dir = await mkdtemp(path.join(os.tmpdir(), "playbook-"))
    dirs.push(dir)
    return openPlaybookDb(path.join(dir, "playbook.sqlite"))
  }

  it("seeds one play with three prerequisites", async () => {
    const { db, client } = await tempDb()
    await seedIfEmpty(db)
    const plays = await listPlays(db)
    expect(plays).toHaveLength(1)
    expect(plays[0]?.name).toBe("Product Demo")
    expect(plays[0]?.prerequisites.filter((item) => item.status === "active")).toHaveLength(3)
    await client.close()
  })

  it("creates, edits, reorders, and retires across reopen", async () => {
    const file = path.join(await mkdtemp(path.join(os.tmpdir(), "playbook-")), "playbook.sqlite")
    dirs.push(path.dirname(file))

    const first = await openPlaybookDb(file)
    await seedIfEmpty(first.db)
    const playId = await createPlay(first.db, {
      name: "Custom Demo",
      typicalStage: "Evaluate",
      purpose: "Used when a standard product demo cannot answer the remaining question.",
    })
    await first.client.close()

    const second = await openPlaybookDb(file)
    await updatePlay(second.db, playId, {
      name: "Custom Demo",
      typicalStage: "Evaluate",
      purpose: "A tailored demonstration against a specific environment or dataset.",
    })
    const firstPrereq = await addPrerequisite(second.db, playId, {
      text: "The business problem is understood",
      intent: "required",
    })
    const secondPrereq = await addPrerequisite(second.db, playId, {
      text: "A standard product demo cannot answer the remaining question",
      intent: "required",
    })
    await reorderPrerequisite(second.db, secondPrereq, -1)
    await setPrerequisiteStatus(second.db, firstPrereq, "retired")
    await second.client.close()

    const third = await openPlaybookDb(file)
    const custom = (await listPlays(third.db)).find((play) => play.id === playId)
    expect(custom?.purpose).toContain("tailored demonstration")
    const active = custom?.prerequisites.filter((item) => item.status === "active") ?? []
    const retired = custom?.prerequisites.filter((item) => item.status === "retired") ?? []
    expect(active).toHaveLength(1)
    expect(active[0]?.text).toContain("standard product demo")
    expect(retired).toHaveLength(1)
    expect(retired[0]?.id).toBe(firstPrereq)
    await third.client.close()
  })
})
