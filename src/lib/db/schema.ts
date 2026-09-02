import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

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

export const schema = {
  plays,
  prerequisites,
  exceptionReasons,
  playbookEvents,
}
