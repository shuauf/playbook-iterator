import { eq } from "drizzle-orm"

import { parseIsoDate } from "@/lib/dates"
import type { PlaybookDb } from "@/lib/db/types"
import {
  exceptionReasons,
  opportunities,
  playRuns,
  plays,
  prerequisiteChecks,
  prerequisiteVersions,
  prerequisites,
} from "@/lib/db/schema"
import { newId } from "@/lib/ids"
import { parseCsv } from "@/lib/import/parse"
import { syntheticCsvBundle } from "@/lib/import/synthetic"

export async function loadSyntheticDataset(db: PlaybookDb) {
  const files = syntheticCsvBundle()
  const oppParsed = parseCsv(files.opportunities)
  const runParsed = parseCsv(files.playRuns)
  const checkParsed = parseCsv(files.checks)

  const existingOpps = await db.select().from(opportunities)
  const existingRuns = await db.select().from(playRuns)
  const playRows = await db.select().from(plays)
  const prereqRows = await db.select().from(prerequisites)
  const versions = await db.select().from(prerequisiteVersions)
  const reasons = await db.select().from(exceptionReasons)

  const oppByExternal = new Map(existingOpps.map((row) => [row.externalId, row]))
  const runByExternal = new Map(existingRuns.map((row) => [row.externalId, row]))
  const playById = new Map(playRows.map((row) => [row.id, row]))
  const prereqById = new Map(prereqRows.map((row) => [row.id, row]))
  const reasonById = new Map(reasons.map((row) => [row.id, row]))
  const currentByPrereq = new Map(
    versions.filter((row) => row.isCurrent).map((row) => [row.prerequisiteId, row])
  )

  await db.transaction(async (tx) => {
    for (const row of oppParsed.rows) {
      const createdAt = parseIsoDate(row.created_at) ?? new Date()
      const advanced =
        row.advanced === "true" ? 1 : row.advanced === "false" ? 0 : null
      const existing = oppByExternal.get(row.external_id)
      const now = new Date()
      if (existing) {
        await tx
          .update(opportunities)
          .set({
            name: row.name,
            account: row.account,
            segment: row.segment,
            se: row.se,
            stage: row.stage,
            status: row.status,
            advanced,
            advancedOn: parseIsoDate(row.advanced_on),
            closeDate: parseIsoDate(row.close_date),
            updatedAt: now,
          })
          .where(eq(opportunities.id, existing.id))
      } else {
        const id = row.external_id
        await tx.insert(opportunities).values({
          id,
          externalId: row.external_id,
          name: row.name,
          account: row.account,
          segment: row.segment,
          se: row.se,
          stage: row.stage,
          status: row.status,
          createdAt,
          updatedAt: now,
          advanced,
          advancedOn: parseIsoDate(row.advanced_on),
          closeDate: parseIsoDate(row.close_date),
        })
        oppByExternal.set(row.external_id, {
          id,
          externalId: row.external_id,
        } as (typeof existingOpps)[number])
      }
    }

    for (const row of runParsed.rows) {
      const play = playById.get(row.play_id)
      const opp = oppByExternal.get(row.opportunity_external_id)
      if (!play || !opp) {
        throw new Error(
          `Synthetic run ${row.external_id} is missing play ${row.play_id} or opportunity ${row.opportunity_external_id}.`
        )
      }
      const existing = runByExternal.get(row.external_id)
      const runAt = parseIsoDate(row.run_at) ?? new Date()
      if (existing) {
        await tx
          .update(playRuns)
          .set({
            opportunityId: opp.id,
            playId: play.id,
            playName: play.name,
            typicalStage: play.typicalStage,
            definitionVersion: play.definitionVersion,
            stageAtRun: row.stage_at_run || play.typicalStage,
            runAt,
          })
          .where(eq(playRuns.id, existing.id))
      } else {
        const id = row.external_id
        await tx.insert(playRuns).values({
          id,
          externalId: row.external_id,
          opportunityId: opp.id,
          playId: play.id,
          playName: play.name,
          typicalStage: play.typicalStage,
          definitionVersion: play.definitionVersion,
          stageAtRun: row.stage_at_run || play.typicalStage,
          runAt,
          createdAt: new Date(),
        })
        runByExternal.set(row.external_id, {
          id,
          externalId: row.external_id,
        } as (typeof existingRuns)[number])
      }
    }

    const runIds = [...new Set(checkParsed.rows.map((row) => {
      const run = runByExternal.get(row.play_run_external_id)
      return run?.id
    }).filter(Boolean))] as string[]

    for (const runId of runIds) {
      await tx.delete(prerequisiteChecks).where(eq(prerequisiteChecks.playRunId, runId))
    }

    for (const row of checkParsed.rows) {
      const run = runByExternal.get(row.play_run_external_id)
      const prereq = prereqById.get(row.prerequisite_id)
      const version = currentByPrereq.get(row.prerequisite_id)
      if (!run || !prereq) {
        throw new Error(
          `Synthetic check is missing run ${row.play_run_external_id} or prerequisite ${row.prerequisite_id}.`
        )
      }
      const met = row.met === "true"
      const reason = row.exception_reason_id ? reasonById.get(row.exception_reason_id) : null
      await tx.insert(prerequisiteChecks).values({
        id: newId("chk"),
        playRunId: run.id,
        prerequisiteId: prereq.id,
        prerequisiteVersionId: version?.id ?? `${prereq.id}-v1`,
        text: version?.text ?? prereq.text,
        intent: version?.intent ?? prereq.intent,
        met,
        exceptionReasonId: met ? null : reason?.id ?? null,
        exceptionReasonLabel: met ? null : reason?.label ?? null,
        note: row.note || null,
        approver: row.approver || null,
      })
    }
  })

  return {
    opportunities: oppParsed.rows.length,
    playRuns: runParsed.rows.length,
    checks: checkParsed.rows.length,
  }
}
