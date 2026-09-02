import type { PlaybookDb } from "@/lib/db/types"
import { exceptionReasons, playbookEvents, plays, prerequisites } from "@/lib/db/schema"

export async function seedIfEmpty(db: PlaybookDb) {
  const existing = await db.select({ id: plays.id }).from(plays).limit(1)
  if (existing.length > 0) return

  const now = new Date()
  const playId = "product-demo"

  await db.insert(plays).values({
    id: playId,
    name: "Product Demo",
    typicalStage: "Evaluate",
    purpose:
      "A working-product walkthrough for a known business problem and a named audience. Used when discovery is complete enough to show relevant capability — not a tour.",
    status: "active",
    definitionVersion: 1,
    createdAt: now,
    updatedAt: now,
  })

  await db.insert(prerequisites).values([
    {
      id: "pd-direct-discovery",
      playId,
      text: "The SE has completed direct discovery",
      intent: "required",
      sortOrder: 0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "pd-business-problem",
      playId,
      text: "The business problem is understood",
      intent: "required",
      sortOrder: 1,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "pd-champion",
      playId,
      text: "A champion or accountable stakeholder is involved",
      intent: "recommended",
      sortOrder: 2,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
  ])

  await db.insert(exceptionReasons).values([
    {
      id: "ae-pressure",
      label: "AE pressure",
      description:
        "The account executive asked to proceed despite unmet prerequisites.",
      sortOrder: 0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "timeline",
      label: "Timeline compression",
      description: "The prospect’s timeline did not allow the standard sequence.",
      sortOrder: 1,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "refusal",
      label: "Prospect refusal",
      description:
        "The customer declined a discovery or prerequisite conversation.",
      sortOrder: 2,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "technical-audience",
      label: "Technical audience",
      description:
        "The room was assumed to already understand the problem and product.",
      sortOrder: 3,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "existing-relationship",
      label: "Existing relationship",
      description:
        "Prior working history was treated as a substitute for current discovery.",
      sortOrder: 4,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "resourcing",
      label: "Resourcing constraints",
      description:
        "Staffing or calendar limits prevented the standard preparation.",
      sortOrder: 5,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "no-owner",
      label: "No clear owner",
      description: "Nobody owned the prerequisite, so the play ran anyway.",
      sortOrder: 6,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "other",
      label: "Other",
      description: "Requires a written note.",
      sortOrder: 7,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
  ])

  await db.insert(playbookEvents).values({
    id: crypto.randomUUID(),
    playId,
    summary:
      "Seeded as the initial standard: Product Demo with three prerequisites. Later edits write history here instead of rewriting this row.",
    createdAt: now,
  })
}
