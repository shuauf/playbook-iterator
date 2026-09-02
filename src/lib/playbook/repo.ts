import { and, asc, desc, eq, sql } from "drizzle-orm"

import type { PlaybookDb } from "@/lib/db/types"
import {
  exceptionReasons,
  playbookEvents,
  plays,
  prerequisites,
} from "@/lib/db/schema"
import type {
  ExceptionReasonDto,
  PlayDto,
  PlayStatus,
  PrerequisiteDto,
  PrerequisiteIntent,
} from "@/lib/playbook/types"

function requiredText(value: string, label: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error(`${label} is required.`)
  }
  return trimmed
}

function formatEventDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

async function bumpPlay(
  db: PlaybookDb,
  playId: string,
  summary: string,
  now = new Date()
) {
  await db
    .update(plays)
    .set({
      updatedAt: now,
      definitionVersion: sql`${plays.definitionVersion} + 1`,
    })
    .where(eq(plays.id, playId))

  await db.insert(playbookEvents).values({
    id: crypto.randomUUID(),
    playId,
    summary,
    createdAt: now,
  })
}

export async function listPlays(db: PlaybookDb): Promise<PlayDto[]> {
  const playRows = await db.select().from(plays).orderBy(asc(plays.createdAt))
  const prereqRows = await db
    .select()
    .from(prerequisites)
    .orderBy(asc(prerequisites.sortOrder), asc(prerequisites.createdAt))
  const eventRows = await db
    .select()
    .from(playbookEvents)
    .orderBy(desc(playbookEvents.createdAt))

  return playRows.map((play) => ({
    id: play.id,
    name: play.name,
    typicalStage: play.typicalStage,
    purpose: play.purpose,
    status: play.status as PlayStatus,
    definitionVersion: play.definitionVersion,
    prerequisites: prereqRows
      .filter((item) => item.playId === play.id)
      .map(
        (item): PrerequisiteDto => ({
          id: item.id,
          playId: item.playId,
          text: item.text,
          intent: item.intent as PrerequisiteIntent,
          sortOrder: item.sortOrder,
          status: item.status as PlayStatus,
        })
      ),
    history: eventRows
      .filter((item) => item.playId === play.id)
      .slice(0, 12)
      .map((item) => ({
        id: item.id,
        summary: item.summary,
        at: formatEventDate(item.createdAt),
      })),
  }))
}

export async function listReasons(
  db: PlaybookDb
): Promise<ExceptionReasonDto[]> {
  const rows = await db
    .select()
    .from(exceptionReasons)
    .orderBy(asc(exceptionReasons.sortOrder), asc(exceptionReasons.createdAt))

  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    description: row.description,
    sortOrder: row.sortOrder,
    status: row.status as PlayStatus,
  }))
}

export async function createPlay(
  db: PlaybookDb,
  input: { name: string; typicalStage: string; purpose: string }
) {
  const name = requiredText(input.name, "Play name")
  const typicalStage = requiredText(input.typicalStage, "Typical stage")
  const purpose = requiredText(input.purpose, "Purpose")
  const now = new Date()
  const id = crypto.randomUUID()

  await db.insert(plays).values({
    id,
    name,
    typicalStage,
    purpose,
    status: "active",
    definitionVersion: 1,
    createdAt: now,
    updatedAt: now,
  })
  await db.insert(playbookEvents).values({
    id: crypto.randomUUID(),
    playId: id,
    summary: `Created play “${name}” for the ${typicalStage} stage.`,
    createdAt: now,
  })
  return id
}

export async function updatePlay(
  db: PlaybookDb,
  playId: string,
  input: { name: string; typicalStage: string; purpose: string }
) {
  const name = requiredText(input.name, "Play name")
  const typicalStage = requiredText(input.typicalStage, "Typical stage")
  const purpose = requiredText(input.purpose, "Purpose")
  const now = new Date()

  const current = await db.select().from(plays).where(eq(plays.id, playId)).limit(1)
  const play = current[0]
  if (!play) throw new Error("Play not found.")

  await db
    .update(plays)
    .set({ name, typicalStage, purpose, updatedAt: now })
    .where(eq(plays.id, playId))

  await bumpPlay(
    db,
    playId,
    play.purpose !== purpose
      ? `Updated purpose of “${name}”.`
      : play.typicalStage !== typicalStage
        ? `Moved “${name}” to the ${typicalStage} stage.`
        : `Renamed play to “${name}”.`,
    now
  )
}

export async function setPlayStatus(
  db: PlaybookDb,
  playId: string,
  status: PlayStatus
) {
  const current = await db.select().from(plays).where(eq(plays.id, playId)).limit(1)
  const play = current[0]
  if (!play) throw new Error("Play not found.")
  const now = new Date()

  await db
    .update(plays)
    .set({
      status,
      retiredAt: status === "retired" ? now : null,
      updatedAt: now,
    })
    .where(eq(plays.id, playId))

  await bumpPlay(
    db,
    playId,
    status === "retired"
      ? `Retired “${play.name}”. Historical runs will keep the definition used when they were logged.`
      : `Reactivated “${play.name}”.`,
    now
  )
}

export async function addPrerequisite(
  db: PlaybookDb,
  playId: string,
  input: { text: string; intent: PrerequisiteIntent }
) {
  const text = requiredText(input.text, "Prerequisite")
  const play = (
    await db.select().from(plays).where(eq(plays.id, playId)).limit(1)
  )[0]
  if (!play) throw new Error("Play not found.")
  if (play.status === "retired") {
    throw new Error("Reactivate the play before adding prerequisites.")
  }

  const siblings = await db
    .select()
    .from(prerequisites)
    .where(
      and(eq(prerequisites.playId, playId), eq(prerequisites.status, "active"))
    )
  const now = new Date()
  const id = crypto.randomUUID()

  await db.insert(prerequisites).values({
    id,
    playId,
    text,
    intent: input.intent,
    sortOrder: siblings.length,
    status: "active",
    createdAt: now,
    updatedAt: now,
  })
  await bumpPlay(
    db,
    playId,
    `Added ${input.intent} prerequisite: “${text}”.`,
    now
  )
  return id
}

export async function updatePrerequisite(
  db: PlaybookDb,
  prerequisiteId: string,
  input: { text?: string; intent?: PrerequisiteIntent }
) {
  const current = (
    await db
      .select()
      .from(prerequisites)
      .where(eq(prerequisites.id, prerequisiteId))
      .limit(1)
  )[0]
  if (!current) throw new Error("Prerequisite not found.")
  if (current.status === "retired") {
    throw new Error("Reactivate the prerequisite before editing it.")
  }

  const now = new Date()
  const text =
    input.text !== undefined
      ? requiredText(input.text, "Prerequisite")
      : current.text
  const intent = input.intent ?? (current.intent as PrerequisiteIntent)

  await db
    .update(prerequisites)
    .set({ text, intent, updatedAt: now })
    .where(eq(prerequisites.id, prerequisiteId))

  const summary =
    input.intent && input.intent !== current.intent
      ? `Marked “${text}” as ${input.intent}.`
      : `Edited prerequisite to “${text}”.`
  await bumpPlay(db, current.playId, summary, now)
}

export async function reorderPrerequisite(
  db: PlaybookDb,
  prerequisiteId: string,
  direction: -1 | 1
) {
  const current = (
    await db
      .select()
      .from(prerequisites)
      .where(eq(prerequisites.id, prerequisiteId))
      .limit(1)
  )[0]
  if (!current) throw new Error("Prerequisite not found.")

  const active = (
    await db
      .select()
      .from(prerequisites)
      .where(
        and(
          eq(prerequisites.playId, current.playId),
          eq(prerequisites.status, "active")
        )
      )
  ).sort((a, b) => a.sortOrder - b.sortOrder)

  const index = active.findIndex((item) => item.id === prerequisiteId)
  const nextIndex = index + direction
  if (index < 0 || nextIndex < 0 || nextIndex >= active.length) return

  const reordered = [...active]
  const [moved] = reordered.splice(index, 1)
  reordered.splice(nextIndex, 0, moved)
  const now = new Date()

  for (const [sortOrder, item] of reordered.entries()) {
    await db
      .update(prerequisites)
      .set({ sortOrder, updatedAt: now })
      .where(eq(prerequisites.id, item.id))
  }
  await bumpPlay(db, current.playId, "Reordered prerequisites.", now)
}

export async function setPrerequisiteStatus(
  db: PlaybookDb,
  prerequisiteId: string,
  status: PlayStatus
) {
  const current = (
    await db
      .select()
      .from(prerequisites)
      .where(eq(prerequisites.id, prerequisiteId))
      .limit(1)
  )[0]
  if (!current) throw new Error("Prerequisite not found.")
  const now = new Date()

  await db
    .update(prerequisites)
    .set({
      status,
      retiredAt: status === "retired" ? now : null,
      updatedAt: now,
    })
    .where(eq(prerequisites.id, prerequisiteId))

  await bumpPlay(
    db,
    current.playId,
    status === "retired"
      ? `Retired prerequisite “${current.text}”. Past runs keep the wording that was in force.`
      : `Reactivated prerequisite “${current.text}”.`,
    now
  )
}

export async function createReason(
  db: PlaybookDb,
  input: { label: string; description: string }
) {
  const label = requiredText(input.label, "Reason label")
  const description = requiredText(input.description, "Reason description")
  const existing = await db.select().from(exceptionReasons)
  const now = new Date()
  const id = crypto.randomUUID()

  await db.insert(exceptionReasons).values({
    id,
    label,
    description,
    sortOrder: existing.length,
    status: "active",
    createdAt: now,
    updatedAt: now,
  })
  return id
}

export async function updateReason(
  db: PlaybookDb,
  reasonId: string,
  input: { label: string; description: string }
) {
  const label = requiredText(input.label, "Reason label")
  const description = requiredText(input.description, "Reason description")
  const now = new Date()
  await db
    .update(exceptionReasons)
    .set({ label, description, updatedAt: now })
    .where(eq(exceptionReasons.id, reasonId))
}

export async function setReasonStatus(
  db: PlaybookDb,
  reasonId: string,
  status: PlayStatus
) {
  const now = new Date()
  await db
    .update(exceptionReasons)
    .set({
      status,
      retiredAt: status === "retired" ? now : null,
      updatedAt: now,
    })
    .where(eq(exceptionReasons.id, reasonId))
}
