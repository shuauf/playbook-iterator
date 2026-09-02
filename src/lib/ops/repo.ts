import { and, desc, eq, inArray } from "drizzle-orm"

import { formatDisplayDate } from "@/lib/dates"
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
import { newExternalId, newId } from "@/lib/ids"
import type { CheckInput, OpportunityDto, OutcomeQueueItemDto, PlayRunDto } from "@/lib/ops/types"
import type { OpportunityStatus, PrerequisiteIntent } from "@/lib/playbook/types"

function requiredText(value: string, label: string) {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`${label} is required.`)
  return trimmed
}

function asStatus(value: string): OpportunityStatus {
  if (value === "open" || value === "won" || value === "lost") return value
  throw new Error("Opportunity status must be open, won, or lost.")
}

function iso(date: Date | null | undefined) {
  if (!date) return null
  return formatDisplayDate(date)
}

function daysBetweenMs(from: Date | null | undefined, to: Date | null | undefined) {
  if (!from || !to) return null
  const fromDay = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const toDay = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((toDay - fromDay) / 86_400_000)
}

function toOpportunityDto(row: typeof opportunities.$inferSelect): OpportunityDto {
  return {
    id: row.id,
    externalId: row.externalId,
    name: row.name,
    account: row.account,
    segment: row.segment,
    se: row.se,
    stage: row.stage,
    status: asStatus(row.status),
    createdAt: formatDisplayDate(row.createdAt),
    createdAtMs: row.createdAt.getTime(),
    advanced: row.advanced === null || row.advanced === undefined ? null : row.advanced === 1,
    advancedOn: iso(row.advancedOn),
    advancedOnMs: row.advancedOn?.getTime() ?? null,
    closeDate: iso(row.closeDate),
    closeDateMs: row.closeDate?.getTime() ?? null,
  }
}

export async function listOpportunities(db: PlaybookDb): Promise<OpportunityDto[]> {
  const rows = await db
    .select()
    .from(opportunities)
    .orderBy(desc(opportunities.updatedAt), desc(opportunities.createdAt))
  return rows.map(toOpportunityDto)
}

export async function createOpportunity(
  db: PlaybookDb,
  input: {
    name: string
    account: string
    segment: string
    se: string
    stage: string
    externalId?: string
  }
) {
  const name = requiredText(input.name, "Opportunity name")
  const account = requiredText(input.account, "Account")
  const segment = requiredText(input.segment, "Segment")
  const se = requiredText(input.se, "SE")
  const stage = requiredText(input.stage, "Stage")
  const now = new Date()
  const id = newId("opp")
  const externalId = input.externalId?.trim() || newExternalId("opp")

  const existing = await db
    .select({ id: opportunities.id })
    .from(opportunities)
    .where(eq(opportunities.externalId, externalId))
    .limit(1)
  if (existing[0]) {
    throw new Error(`An opportunity with id ${externalId} already exists.`)
  }

  await db.insert(opportunities).values({
    id,
    externalId,
    name,
    account,
    segment,
    se,
    stage,
    status: "open",
    createdAt: now,
    updatedAt: now,
  })
  return id
}

export async function recordPlayRun(
  db: PlaybookDb,
  input: {
    opportunityId: string
    playId: string
    runAt?: Date
    externalId?: string
    checks: CheckInput[]
  }
) {
  const opportunity = (
    await db
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, input.opportunityId))
      .limit(1)
  )[0]
  if (!opportunity) throw new Error("Opportunity not found.")

  const play = (
    await db.select().from(plays).where(eq(plays.id, input.playId)).limit(1)
  )[0]
  if (!play) throw new Error("Play not found.")
  if (play.status === "retired") {
    throw new Error("Retired plays cannot receive new runs.")
  }

  const activePrereqs = await db
    .select()
    .from(prerequisites)
    .where(
      and(eq(prerequisites.playId, play.id), eq(prerequisites.status, "active"))
    )

  if (activePrereqs.length === 0) {
    throw new Error("This play has no active prerequisites to check.")
  }

  const currentVersions = await db
    .select()
    .from(prerequisiteVersions)
    .where(eq(prerequisiteVersions.isCurrent, true))
  const versionByPrereq = new Map(
    currentVersions.map((row) => [row.prerequisiteId, row])
  )

  const reasons = await db.select().from(exceptionReasons)
  const reasonById = new Map(reasons.map((row) => [row.id, row]))

  const checkByPrereq = new Map(input.checks.map((item) => [item.prerequisiteId, item]))

  for (const prereq of activePrereqs) {
    const check = checkByPrereq.get(prereq.id)
    if (!check) {
      throw new Error(`Missing check for “${prereq.text}”.`)
    }
    if (!check.met) {
      const reasonId = check.exceptionReasonId?.trim()
      if (!reasonId) {
        throw new Error(
          `“${prereq.text}” is unmet. Choose an exception reason before recording the run.`
        )
      }
      const reason = reasonById.get(reasonId)
      if (!reason || reason.status !== "active") {
        throw new Error("Choose a current exception reason.")
      }
      if (reason.id === "other" && !check.note?.trim()) {
        throw new Error("The “Other” reason needs a written note.")
      }
    }
  }

  const now = new Date()
  const runAt = input.runAt ?? now
  const runId = newId("run")
  const externalId = input.externalId?.trim() || newExternalId("run")

  const existingRun = await db
    .select({ id: playRuns.id })
    .from(playRuns)
    .where(eq(playRuns.externalId, externalId))
    .limit(1)
  if (existingRun[0]) {
    throw new Error(`A play run with id ${externalId} already exists.`)
  }

  await db.insert(playRuns).values({
    id: runId,
    externalId,
    opportunityId: opportunity.id,
    playId: play.id,
    playName: play.name,
    typicalStage: play.typicalStage,
    definitionVersion: play.definitionVersion,
    stageAtRun: opportunity.stage,
    runAt,
    createdAt: now,
  })

  await db.insert(prerequisiteChecks).values(
    activePrereqs.map((prereq) => {
      const check = checkByPrereq.get(prereq.id)!
      const version = versionByPrereq.get(prereq.id)
      if (!version) {
        throw new Error(`Prerequisite “${prereq.text}” is missing a current version.`)
      }
      const reason = check.met ? null : reasonById.get(check.exceptionReasonId ?? "")
      return {
        id: newId("chk"),
        playRunId: runId,
        prerequisiteId: prereq.id,
        prerequisiteVersionId: version.id,
        text: version.text,
        intent: version.intent,
        met: check.met,
        exceptionReasonId: check.met ? null : (reason?.id ?? null),
        exceptionReasonLabel: check.met ? null : (reason?.label ?? null),
        note: check.note?.trim() || null,
        approver: check.approver?.trim() || null,
      }
    })
  )

  await db
    .update(opportunities)
    .set({ updatedAt: now })
    .where(eq(opportunities.id, opportunity.id))

  return runId
}

export async function updateOpportunityOutcome(
  db: PlaybookDb,
  opportunityId: string,
  input: {
    advanced?: boolean | null
    advancedOn?: Date | null
    status?: OpportunityStatus
    closeDate?: Date | null
    stage?: string
  }
) {
  const current = (
    await db
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, opportunityId))
      .limit(1)
  )[0]
  if (!current) throw new Error("Opportunity not found.")

  const now = new Date()
  const patch: Partial<typeof opportunities.$inferInsert> = { updatedAt: now }

  if (input.advanced !== undefined) {
    patch.advanced =
      input.advanced === null ? null : input.advanced ? 1 : 0
    patch.advancedOn =
      input.advanced === null ? null : (input.advancedOn ?? now)
  }
  if (input.advancedOn !== undefined && input.advanced !== undefined && input.advanced !== null) {
    patch.advancedOn = input.advancedOn
  }
  if (input.status) {
    patch.status = input.status
    if (input.status === "won") patch.stage = input.stage ?? "Closed won"
    if (input.status === "lost") patch.stage = input.stage ?? "Closed lost"
    if (input.status === "open" && (current.status === "won" || current.status === "lost")) {
      patch.stage = input.stage ?? current.stage.replace(/^Closed (won|lost)$/i, "Evaluate")
    }
  }
  if (input.closeDate !== undefined) {
    patch.closeDate = input.closeDate
  }
  if (input.status === "won" || input.status === "lost") {
    patch.closeDate = input.closeDate ?? current.closeDate ?? now
  }
  if (input.stage && input.status === "open") {
    patch.stage = input.stage
  }

  await db.update(opportunities).set(patch).where(eq(opportunities.id, opportunityId))
}

export async function listPlayRuns(db: PlaybookDb): Promise<PlayRunDto[]> {
  const runRows = await db.select().from(playRuns).orderBy(desc(playRuns.runAt), desc(playRuns.createdAt))
  if (runRows.length === 0) return []

  const oppIds = [...new Set(runRows.map((row) => row.opportunityId))]
  const oppRows = await db
    .select()
    .from(opportunities)
    .where(inArray(opportunities.id, oppIds))
  const oppById = new Map(oppRows.map((row) => [row.id, row]))

  const checkRows = await db.select().from(prerequisiteChecks)
  const prereqRows = await db.select().from(prerequisites)
  const prereqById = new Map(prereqRows.map((row) => [row.id, row]))
  const currentVersions = await db
    .select()
    .from(prerequisiteVersions)
    .where(eq(prerequisiteVersions.isCurrent, true))
  const currentByPrereq = new Map(currentVersions.map((row) => [row.prerequisiteId, row]))

  const checksByRun = new Map<string, typeof checkRows>()
  for (const check of checkRows) {
    const list = checksByRun.get(check.playRunId) ?? []
    list.push(check)
    checksByRun.set(check.playRunId, list)
  }

  return runRows.map((run) => {
    const opp = oppById.get(run.opportunityId)
    const checks = checksByRun.get(run.id) ?? []
    const status = opp ? asStatus(opp.status) : "open"
    return {
      id: run.id,
      externalId: run.externalId,
      opportunityId: run.opportunityId,
      opportunityName: opp?.name ?? "Unknown opportunity",
      opportunityAccount: opp?.account ?? "",
      opportunityStatus: status,
      playId: run.playId,
      playName: run.playName,
      typicalStage: run.typicalStage,
      definitionVersion: run.definitionVersion,
      stageAtRun: run.stageAtRun,
      runAt: formatDisplayDate(run.runAt),
      runAtMs: run.runAt.getTime(),
      exceptionCount: checks.filter((item) => !item.met).length,
      daysToAdvancement:
        opp?.advanced === 1 ? daysBetweenMs(run.runAt, opp.advancedOn) : null,
      daysToClose:
        status === "won" || status === "lost"
          ? daysBetweenMs(run.runAt, opp?.closeDate)
          : null,
      advanced:
        opp?.advanced === null || opp?.advanced === undefined
          ? null
          : opp.advanced === 1,
      closeStatus: status,
      checks: checks.map((check) => {
        const identity = prereqById.get(check.prerequisiteId)
        const current = currentByPrereq.get(check.prerequisiteId)
        return {
          id: check.id,
          prerequisiteId: check.prerequisiteId,
          prerequisiteVersionId: check.prerequisiteVersionId,
          text: check.text,
          intent: check.intent as PrerequisiteIntent,
          met: check.met,
          exceptionReasonId: check.exceptionReasonId,
          exceptionReasonLabel: check.exceptionReasonLabel,
          note: check.note,
          approver: check.approver,
          currentText: current?.text ?? identity?.text ?? null,
          prerequisiteStatus: (identity?.status ?? "active") as "active" | "retired",
        }
      }),
    }
  })
}

export async function loadAnalysisRecords(db: PlaybookDb) {
  const [opps, runs] = await Promise.all([listOpportunities(db), listPlayRuns(db)])
  return { opportunities: opps, runs }
}

export async function listOutcomeQueue(
  db: PlaybookDb
): Promise<OutcomeQueueItemDto[]> {
  const [opps, runs] = await Promise.all([listOpportunities(db), listPlayRuns(db)])
  const latestByOpp = new Map<string, PlayRunDto>()
  for (const run of runs) {
    if (!latestByOpp.has(run.opportunityId)) latestByOpp.set(run.opportunityId, run)
  }

  const items: OutcomeQueueItemDto[] = []
  for (const opp of opps) {
    const latest = latestByOpp.get(opp.id)
    if (!latest) continue

    if (opp.advanced === null) {
      items.push({
        opportunityId: opp.id,
        type: "advancement",
        opportunityName: opp.name,
        account: opp.account,
        se: opp.se,
        stage: opp.stage,
        latestPlayName: latest.playName,
        latestRunAt: latest.runAt,
        detail:
          latest.exceptionCount === 0
            ? "Clean run. Did this opportunity move forward after the play?"
            : `${latest.exceptionCount} exception${latest.exceptionCount === 1 ? "" : "s"} logged. Advancement after the play is still unanswered.`,
      })
    }

    if (opp.status === "open") {
      items.push({
        opportunityId: opp.id,
        type: "close",
        opportunityName: opp.name,
        account: opp.account,
        se: opp.se,
        stage: opp.stage,
        latestPlayName: latest.playName,
        latestRunAt: latest.runAt,
        detail:
          opp.advanced === true
            ? "Advanced after the play. Record whether it closed won or lost, and when."
            : opp.advanced === false
              ? "Did not advance. Confirm whether this opportunity closed lost or is still working."
              : "Open opportunity with at least one play run. Record the close result when it is known.",
      })
    }
  }

  return items
}
