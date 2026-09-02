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
import { SEGMENTS } from "@/lib/playbook/types"

export type ImportKind = "opportunities" | "play_runs" | "prerequisite_checks"

export type PreviewStatus = "new" | "update" | "error" | "duplicate"

export type PreviewRow = {
  row: number
  kind: ImportKind
  externalId: string
  summary: string
  status: PreviewStatus
  message: string
  payload?: Record<string, unknown>
}

export type ImportPreview = {
  kind: ImportKind
  rows: PreviewRow[]
  newCount: number
  updateCount: number
  errorCount: number
  duplicateCount: number
  canCommit: boolean
}

const OPP_HEADERS = [
  "external_id",
  "name",
  "account",
  "segment",
  "se",
  "stage",
  "status",
  "created_at",
  "advanced",
  "advanced_on",
  "close_date",
] as const

const RUN_HEADERS = [
  "external_id",
  "opportunity_external_id",
  "play_id",
  "stage_at_run",
  "run_at",
] as const

const CHECK_HEADERS = [
  "play_run_external_id",
  "prerequisite_id",
  "met",
  "exception_reason_id",
  "note",
  "approver",
] as const

function cell(row: Record<string, string>, key: string) {
  return row[key] ?? ""
}

function parseBool(value: string): boolean | null {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  if (["1", "true", "yes", "y", "met"].includes(normalized)) return true
  if (["0", "false", "no", "n", "unmet"].includes(normalized)) return false
  return undefined as unknown as boolean
}

function requireHeaders(headers: string[], needed: readonly string[]) {
  const missing = needed.filter((item) => !headers.includes(item))
  if (missing.length > 0) {
    throw new Error(`Missing columns: ${missing.join(", ")}`)
  }
}

function markDuplicates(rows: PreviewRow[], key: (row: PreviewRow) => string) {
  const seen = new Map<string, PreviewRow>()
  for (const row of rows) {
    const id = key(row)
    if (!id) continue
    const first = seen.get(id)
    if (!first) {
      seen.set(id, row)
      continue
    }
    first.status = "duplicate"
    first.message = `Duplicate id “${id}” appears more than once in this file.`
    row.status = "duplicate"
    row.message = `Duplicate id “${id}” appears more than once in this file.`
  }
}

function counts(rows: PreviewRow[]): ImportPreview["newCount"] extends never ? never : Pick<ImportPreview, "newCount" | "updateCount" | "errorCount" | "duplicateCount" | "canCommit"> {
  const newCount = rows.filter((row) => row.status === "new").length
  const updateCount = rows.filter((row) => row.status === "update").length
  const errorCount = rows.filter((row) => row.status === "error").length
  const duplicateCount = rows.filter((row) => row.status === "duplicate").length
  return {
    newCount,
    updateCount,
    errorCount,
    duplicateCount,
    canCommit: errorCount === 0 && duplicateCount === 0 && rows.length > 0,
  }
}

export async function previewCsv(
  db: PlaybookDb,
  kind: ImportKind,
  csvText: string
): Promise<ImportPreview> {
  const parsed = parseCsv(csvText)
  if (kind === "opportunities") return previewOpportunities(db, parsed.headers, parsed.rows)
  if (kind === "play_runs") return previewPlayRuns(db, parsed.headers, parsed.rows)
  return previewChecks(db, parsed.headers, parsed.rows)
}

async function previewOpportunities(
  db: PlaybookDb,
  headers: string[],
  rows: Record<string, string>[]
): Promise<ImportPreview> {
  requireHeaders(headers, ["external_id", "name", "account", "segment", "se", "stage", "status"])
  const existing = await db.select().from(opportunities)
  const byExternal = new Map(existing.map((row) => [row.externalId, row]))
  const preview: PreviewRow[] = rows.map((row, index) => {
    const externalId = cell(row, "external_id")
    const name = cell(row, "name")
    const account = cell(row, "account")
    const segment = cell(row, "segment")
    const se = cell(row, "se")
    const stage = cell(row, "stage")
    const status = cell(row, "status").toLowerCase()
    const createdAt = cell(row, "created_at")
    const advancedRaw = cell(row, "advanced")
    const errors: string[] = []
    if (!externalId) errors.push("external_id is required.")
    if (!name) errors.push("name is required.")
    if (!account) errors.push("account is required.")
    if (!se) errors.push("se is required.")
    if (!stage) errors.push("stage is required.")
    if (!["open", "won", "lost"].includes(status)) errors.push("status must be open, won, or lost.")
    if (segment && !SEGMENTS.includes(segment as (typeof SEGMENTS)[number])) {
      errors.push("segment must be SMB, Mid-market, or Enterprise.")
    }
    if (!segment) errors.push("segment is required.")
    const created = createdAt ? parseIsoDate(createdAt) : new Date()
    if (createdAt && !created) errors.push("created_at is not a valid date.")
    const advanced = advancedRaw ? parseBool(advancedRaw) : null
    if (advancedRaw && advanced === (undefined as unknown as boolean)) {
      errors.push("advanced must be true, false, or blank.")
    }
    const advancedOn = cell(row, "advanced_on") ? parseIsoDate(cell(row, "advanced_on")) : null
    if (cell(row, "advanced_on") && !advancedOn) errors.push("advanced_on is not a valid date.")
    const closeDate = cell(row, "close_date") ? parseIsoDate(cell(row, "close_date")) : null
    if (cell(row, "close_date") && !closeDate) errors.push("close_date is not a valid date.")
    if ((status === "won" || status === "lost") && !closeDate && !cell(row, "close_date")) {
      errors.push("closed opportunities need a close_date.")
    }

    const found = byExternal.get(externalId)
    const summary = `${name || "(missing name)"} · ${account || "no account"}`
    if (errors.length > 0) {
      return {
        row: index + 2,
        kind: "opportunities",
        externalId,
        summary,
        status: "error",
        message: errors.join(" "),
      }
    }
    return {
      row: index + 2,
      kind: "opportunities",
      externalId,
      summary,
      status: found ? "update" : "new",
      message: found
        ? `Will update existing opportunity ${externalId}.`
        : `Will create opportunity ${externalId}.`,
      payload: {
        externalId,
        name,
        account,
        segment,
        se,
        stage,
        status,
        createdAt: created,
        advanced: advanced === true ? 1 : advanced === false ? 0 : null,
        advancedOn,
        closeDate,
        existingId: found?.id ?? null,
      },
    }
  })
  markDuplicates(preview, (row) => row.externalId)
  return { kind: "opportunities", rows: preview, ...counts(preview) }
}

async function previewPlayRuns(
  db: PlaybookDb,
  headers: string[],
  rows: Record<string, string>[]
): Promise<ImportPreview> {
  requireHeaders(headers, ["external_id", "opportunity_external_id", "play_id", "run_at"])
  const [oppRows, playRows, runRows] = await Promise.all([
    db.select().from(opportunities),
    db.select().from(plays),
    db.select().from(playRuns),
  ])
  const oppByExternal = new Map(oppRows.map((row) => [row.externalId, row]))
  const playById = new Map(playRows.map((row) => [row.id, row]))
  const playByName = new Map(playRows.map((row) => [row.name.toLowerCase(), row]))
  const runByExternal = new Map(runRows.map((row) => [row.externalId, row]))

  const preview: PreviewRow[] = rows.map((row, index) => {
    const externalId = cell(row, "external_id")
    const oppExternal = cell(row, "opportunity_external_id")
    const playKey = cell(row, "play_id")
    const runAtRaw = cell(row, "run_at")
    const errors: string[] = []
    if (!externalId) errors.push("external_id is required.")
    if (!oppExternal) errors.push("opportunity_external_id is required.")
    if (!playKey) errors.push("play_id is required.")
    const opp = oppByExternal.get(oppExternal)
    if (oppExternal && !opp) errors.push(`Opportunity ${oppExternal} does not exist.`)
    const play = playById.get(playKey) ?? playByName.get(playKey.toLowerCase())
    if (playKey && !play) errors.push(`Play ${playKey} does not exist.`)
    const runAt = parseIsoDate(runAtRaw)
    if (!runAtRaw) errors.push("run_at is required.")
    else if (!runAt) errors.push("run_at is not a valid date.")
    const found = runByExternal.get(externalId)
    const summary = `${play?.name ?? playKey} · ${opp?.name ?? oppExternal}`
    if (errors.length > 0) {
      return {
        row: index + 2,
        kind: "play_runs",
        externalId,
        summary,
        status: "error",
        message: errors.join(" "),
      }
    }
    return {
      row: index + 2,
      kind: "play_runs",
      externalId,
      summary,
      status: found ? "update" : "new",
      message: found ? `Will update run ${externalId}.` : `Will create run ${externalId}.`,
      payload: {
        externalId,
        opportunityId: opp!.id,
        playId: play!.id,
        playName: play!.name,
        typicalStage: play!.typicalStage,
        definitionVersion: play!.definitionVersion,
        stageAtRun: cell(row, "stage_at_run") || opp!.stage,
        runAt,
        existingId: found?.id ?? null,
      },
    }
  })
  markDuplicates(preview, (row) => row.externalId)
  return { kind: "play_runs", rows: preview, ...counts(preview) }
}

async function previewChecks(
  db: PlaybookDb,
  headers: string[],
  rows: Record<string, string>[]
): Promise<ImportPreview> {
  requireHeaders(headers, ["play_run_external_id", "prerequisite_id", "met"])
  const [runRows, prereqRows, reasonRows, versions] = await Promise.all([
    db.select().from(playRuns),
    db.select().from(prerequisites),
    db.select().from(exceptionReasons),
    db.select().from(prerequisiteVersions),
  ])
  const runByExternal = new Map(runRows.map((row) => [row.externalId, row]))
  const prereqById = new Map(prereqRows.map((row) => [row.id, row]))
  const reasonById = new Map(reasonRows.map((row) => [row.id, row]))
  const currentByPrereq = new Map(
    versions.filter((row) => row.isCurrent).map((row) => [row.prerequisiteId, row])
  )

  const preview: PreviewRow[] = rows.map((row, index) => {
    const runExternal = cell(row, "play_run_external_id")
    const prerequisiteId = cell(row, "prerequisite_id")
    const met = parseBool(cell(row, "met"))
    const reasonId = cell(row, "exception_reason_id")
    const errors: string[] = []
    if (!runExternal) errors.push("play_run_external_id is required.")
    if (!prerequisiteId) errors.push("prerequisite_id is required.")
    const run = runByExternal.get(runExternal)
    if (runExternal && !run) errors.push(`Play run ${runExternal} does not exist.`)
    const prereq = prereqById.get(prerequisiteId)
    if (prerequisiteId && !prereq) errors.push(`Prerequisite ${prerequisiteId} does not exist.`)
    if (cell(row, "met") === "" || met === (undefined as unknown as boolean) || met === null) {
      errors.push("met must be true or false.")
    }
    if (met === false) {
      if (!reasonId) errors.push("Unmet checks require exception_reason_id.")
      else if (!reasonById.get(reasonId)) errors.push("Unknown exception_reason_id.")
    }
    const version = currentByPrereq.get(prerequisiteId)
    const summary = `${runExternal} · ${prereq?.text ?? prerequisiteId}`
    const externalId = `${runExternal}::${prerequisiteId}`
    if (errors.length > 0) {
      return {
        row: index + 2,
        kind: "prerequisite_checks",
        externalId,
        summary,
        status: "error",
        message: errors.join(" "),
      }
    }
    return {
      row: index + 2,
      kind: "prerequisite_checks",
      externalId,
      summary,
      status: "new",
      message: `Will record ${met ? "met" : "unmet"} check on ${runExternal}.`,
      payload: {
        playRunId: run!.id,
        playRunExternalId: runExternal,
        prerequisiteId,
        prerequisiteVersionId: version?.id ?? `${prerequisiteId}-v1`,
        text: version?.text ?? prereq!.text,
        intent: version?.intent ?? prereq!.intent,
        met,
        exceptionReasonId: met ? null : reasonId,
        exceptionReasonLabel: met ? null : reasonById.get(reasonId)?.label ?? null,
        note: cell(row, "note") || null,
        approver: cell(row, "approver") || null,
      },
    }
  })
  markDuplicates(preview, (row) => row.externalId)
  return { kind: "prerequisite_checks", rows: preview, ...counts(preview) }
}

export async function commitPreview(db: PlaybookDb, preview: ImportPreview) {
  if (!preview.canCommit) {
    throw new Error("Import has errors or duplicates. Nothing was saved.")
  }
  await db.transaction(async (tx) => {
    if (preview.kind === "opportunities") {
      for (const row of preview.rows) {
        const payload = row.payload as {
          externalId: string
          name: string
          account: string
          segment: string
          se: string
          stage: string
          status: "open" | "won" | "lost"
          createdAt: Date
          advanced: number | null
          advancedOn: Date | null
          closeDate: Date | null
          existingId: string | null
        }
        const now = new Date()
        if (payload.existingId) {
          await tx
            .update(opportunities)
            .set({
              name: payload.name,
              account: payload.account,
              segment: payload.segment,
              se: payload.se,
              stage: payload.stage,
              status: payload.status,
              advanced: payload.advanced,
              advancedOn: payload.advancedOn,
              closeDate: payload.closeDate,
              updatedAt: now,
            })
            .where(eq(opportunities.id, payload.existingId))
        } else {
          await tx.insert(opportunities).values({
            id: newId("opp"),
            externalId: payload.externalId,
            name: payload.name,
            account: payload.account,
            segment: payload.segment,
            se: payload.se,
            stage: payload.stage,
            status: payload.status,
            createdAt: payload.createdAt,
            updatedAt: now,
            advanced: payload.advanced,
            advancedOn: payload.advancedOn,
            closeDate: payload.closeDate,
          })
        }
      }
    }

    if (preview.kind === "play_runs") {
      for (const row of preview.rows) {
        const payload = row.payload as {
          externalId: string
          opportunityId: string
          playId: string
          playName: string
          typicalStage: string
          definitionVersion: number
          stageAtRun: string
          runAt: Date
          existingId: string | null
        }
        const now = new Date()
        if (payload.existingId) {
          await tx
            .update(playRuns)
            .set({
              opportunityId: payload.opportunityId,
              playId: payload.playId,
              playName: payload.playName,
              typicalStage: payload.typicalStage,
              definitionVersion: payload.definitionVersion,
              stageAtRun: payload.stageAtRun,
              runAt: payload.runAt,
            })
            .where(eq(playRuns.id, payload.existingId))
        } else {
          await tx.insert(playRuns).values({
            id: newId("run"),
            externalId: payload.externalId,
            opportunityId: payload.opportunityId,
            playId: payload.playId,
            playName: payload.playName,
            typicalStage: payload.typicalStage,
            definitionVersion: payload.definitionVersion,
            stageAtRun: payload.stageAtRun,
            runAt: payload.runAt,
            createdAt: now,
          })
        }
      }
    }

    if (preview.kind === "prerequisite_checks") {
      const runIds = [
        ...new Set(
          preview.rows.map((row) => (row.payload as { playRunId: string }).playRunId)
        ),
      ]
      for (const runId of runIds) {
        await tx.delete(prerequisiteChecks).where(eq(prerequisiteChecks.playRunId, runId))
      }
      for (const row of preview.rows) {
        const payload = row.payload as {
          playRunId: string
          prerequisiteId: string
          prerequisiteVersionId: string
          text: string
          intent: string
          met: boolean
          exceptionReasonId: string | null
          exceptionReasonLabel: string | null
          note: string | null
          approver: string | null
        }
        await tx.insert(prerequisiteChecks).values({
          id: newId("chk"),
          playRunId: payload.playRunId,
          prerequisiteId: payload.prerequisiteId,
          prerequisiteVersionId: payload.prerequisiteVersionId,
          text: payload.text,
          intent: payload.intent,
          met: payload.met,
          exceptionReasonId: payload.exceptionReasonId,
          exceptionReasonLabel: payload.exceptionReasonLabel,
          note: payload.note,
          approver: payload.approver,
        })
      }
    }
  })
}

export const IMPORT_COLUMNS = {
  opportunities: OPP_HEADERS,
  play_runs: RUN_HEADERS,
  prerequisite_checks: CHECK_HEADERS,
}

export const TINY_OPPORTUNITIES_CSV = `external_id,name,account,segment,se,stage,status,created_at,advanced,advanced_on,close_date
opp-new,New Co — expansion,New Co,SMB,Maya Chen,Evaluate,open,2026-07-01,,,
opp-meridian,Meridian Health — platform expansion (updated),Meridian Health,Enterprise,Maya Chen,Evaluate,open,2026-05-12,,,
opp-bad,,,,,SMB,Maya Chen,Evaluate,open,2026-07-01,,,
opp-dup,Dup A,Dup,SMB,Maya Chen,Qualify,open,2026-07-01,,,
opp-dup,Dup B,Dup,SMB,Maya Chen,Qualify,open,2026-07-01,,,
`
