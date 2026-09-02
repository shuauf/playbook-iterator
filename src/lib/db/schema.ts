import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

export const plays = sqliteTable("plays", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  typicalStage: text("typical_stage").notNull(),
  purpose: text("purpose").notNull(),
  status: text("status").notNull(),
  definitionVersion: integer("definition_version").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  retiredAt: integer("retired_at", { mode: "timestamp_ms" }),
})

export const prerequisites = sqliteTable("prerequisites", {
  id: text("id").primaryKey(),
  playId: text("play_id")
    .notNull()
    .references(() => plays.id),
  text: text("text").notNull(),
  intent: text("intent").notNull(),
  sortOrder: integer("sort_order").notNull(),
  status: text("status").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  retiredAt: integer("retired_at", { mode: "timestamp_ms" }),
})

export const prerequisiteVersions = sqliteTable(
  "prerequisite_versions",
  {
    id: text("id").primaryKey(),
    prerequisiteId: text("prerequisite_id")
      .notNull()
      .references(() => prerequisites.id),
    text: text("text").notNull(),
    intent: text("intent").notNull(),
    sortOrder: integer("sort_order").notNull(),
    version: integer("version").notNull(),
    isCurrent: integer("is_current", { mode: "boolean" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    supersededAt: integer("superseded_at", { mode: "timestamp_ms" }),
  },
  (table) => [uniqueIndex("prereq_version_unique").on(table.prerequisiteId, table.version)]
)

export const exceptionReasons = sqliteTable("exception_reasons", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sort_order").notNull(),
  status: text("status").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  retiredAt: integer("retired_at", { mode: "timestamp_ms" }),
})

export const playbookEvents = sqliteTable("playbook_events", {
  id: text("id").primaryKey(),
  playId: text("play_id").references(() => plays.id),
  summary: text("summary").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
})

export const opportunities = sqliteTable(
  "opportunities",
  {
    id: text("id").primaryKey(),
    externalId: text("external_id").notNull(),
    name: text("name").notNull(),
    account: text("account").notNull(),
    segment: text("segment").notNull(),
    se: text("se").notNull(),
    stage: text("stage").notNull(),
    status: text("status").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    advanced: integer("advanced"),
    advancedOn: integer("advanced_on", { mode: "timestamp_ms" }),
    closeDate: integer("close_date", { mode: "timestamp_ms" }),
  },
  (table) => [uniqueIndex("opportunities_external_id_idx").on(table.externalId)]
)

export const playRuns = sqliteTable(
  "play_runs",
  {
    id: text("id").primaryKey(),
    externalId: text("external_id").notNull(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id),
    playId: text("play_id")
      .notNull()
      .references(() => plays.id),
    playName: text("play_name").notNull(),
    typicalStage: text("typical_stage").notNull(),
    definitionVersion: integer("definition_version").notNull(),
    stageAtRun: text("stage_at_run").notNull(),
    runAt: integer("run_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [uniqueIndex("play_runs_external_id_idx").on(table.externalId)]
)

export const prerequisiteChecks = sqliteTable("prerequisite_checks", {
  id: text("id").primaryKey(),
  playRunId: text("play_run_id")
    .notNull()
    .references(() => playRuns.id),
  prerequisiteId: text("prerequisite_id")
    .notNull()
    .references(() => prerequisites.id),
  prerequisiteVersionId: text("prerequisite_version_id")
    .notNull()
    .references(() => prerequisiteVersions.id),
  text: text("text").notNull(),
  intent: text("intent").notNull(),
  met: integer("met", { mode: "boolean" }).notNull(),
  exceptionReasonId: text("exception_reason_id"),
  exceptionReasonLabel: text("exception_reason_label"),
  note: text("note"),
  approver: text("approver"),
})

export const schema = {
  plays,
  prerequisites,
  prerequisiteVersions,
  exceptionReasons,
  playbookEvents,
  opportunities,
  playRuns,
  prerequisiteChecks,
}
