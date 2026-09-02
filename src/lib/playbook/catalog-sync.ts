import { eq } from "drizzle-orm"

import type { PlaybookDb } from "@/lib/db/types"
import {
  playbookEvents,
  plays,
  prerequisiteVersions,
  prerequisites,
} from "@/lib/db/schema"
import { CANONICAL_PLAYS } from "@/lib/playbook/catalog"

export async function ensureCanonicalPlays(db: PlaybookDb) {
  const existingPlays = await db.select({ id: plays.id }).from(plays)
  const existingIds = new Set(existingPlays.map((row) => row.id))
  const existingPrereqs = await db.select({ id: prerequisites.id }).from(prerequisites)
  const existingPrereqIds = new Set(existingPrereqs.map((row) => row.id))
  const now = new Date()

  for (const play of CANONICAL_PLAYS) {
    if (!existingIds.has(play.id)) {
      await db.insert(plays).values({
        id: play.id,
        name: play.name,
        typicalStage: play.typicalStage,
        purpose: play.purpose,
        status: "active",
        definitionVersion: 1,
        createdAt: now,
        updatedAt: now,
      })
      await db.insert(playbookEvents).values({
        id: crypto.randomUUID(),
        playId: play.id,
        summary: `Added canonical play “${play.name}” so interview data can attach to a real definition.`,
        createdAt: now,
      })
    }

    for (const [index, prereq] of play.prerequisites.entries()) {
      if (existingPrereqIds.has(prereq.id)) continue
      const playRow = (
        await db.select().from(plays).where(eq(plays.id, play.id)).limit(1)
      )[0]
      if (!playRow) continue
      await db.insert(prerequisites).values({
        id: prereq.id,
        playId: play.id,
        text: prereq.text,
        intent: prereq.intent,
        sortOrder: index,
        status: "active",
        createdAt: now,
        updatedAt: now,
      })
      await db.insert(prerequisiteVersions).values({
        id: `${prereq.id}-v1`,
        prerequisiteId: prereq.id,
        text: prereq.text,
        intent: prereq.intent,
        sortOrder: index,
        version: 1,
        isCurrent: true,
        createdAt: now,
      })
    }
  }
}
