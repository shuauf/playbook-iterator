"use server"

import { revalidatePath } from "next/cache"

import { parseIsoDate } from "@/lib/dates"
import { getDb } from "@/lib/db"
import { commitPreview, previewCsv, type ImportKind } from "@/lib/import/csv"
import { loadSyntheticDataset } from "@/lib/import/load-synthetic"
import { TINY_OPPORTUNITIES_CSV } from "@/lib/import/csv"
import { syntheticCsvBundle } from "@/lib/import/synthetic"
import {
  createOpportunity,
  recordPlayRun,
  updateOpportunityOutcome,
} from "@/lib/ops/repo"
import type { CheckInput } from "@/lib/ops/types"
import type { OpportunityStatus } from "@/lib/playbook/types"
import { ensureCanonicalPlays } from "@/lib/playbook/catalog-sync"

function fail(error: unknown) {
  return {
    ok: false as const,
    error: error instanceof Error ? error.message : "Something went wrong.",
  }
}

async function refresh() {
  revalidatePath("/config")
  revalidatePath("/log")
  revalidatePath("/results")
}

export async function createOpportunityAction(input: {
  name: string
  account: string
  segment: string
  se: string
  stage: string
}) {
  try {
    const id = await createOpportunity(await getDb(), input)
    await refresh()
    return { ok: true as const, id }
  } catch (error) {
    return fail(error)
  }
}

export async function recordPlayRunAction(input: {
  opportunityId: string
  playId: string
  runAt?: string
  checks: CheckInput[]
}) {
  try {
    const id = await recordPlayRun(await getDb(), {
      opportunityId: input.opportunityId,
      playId: input.playId,
      runAt: input.runAt ? parseIsoDate(input.runAt) ?? undefined : undefined,
      checks: input.checks,
    })
    await refresh()
    return { ok: true as const, id }
  } catch (error) {
    return fail(error)
  }
}

export async function updateOpportunityOutcomeAction(
  opportunityId: string,
  input: {
    advanced?: boolean | null
    advancedOn?: string | null
    status?: OpportunityStatus
    closeDate?: string | null
    stage?: string
  }
) {
  try {
    await updateOpportunityOutcome(await getDb(), opportunityId, {
      advanced: input.advanced,
      advancedOn: input.advancedOn ? parseIsoDate(input.advancedOn) : input.advancedOn === null ? null : undefined,
      status: input.status,
      closeDate: input.closeDate ? parseIsoDate(input.closeDate) : input.closeDate === null ? null : undefined,
      stage: input.stage,
    })
    await refresh()
    return { ok: true as const }
  } catch (error) {
    return fail(error)
  }
}

export async function previewImportAction(kind: ImportKind, csvText: string) {
  try {
    const preview = await previewCsv(await getDb(), kind, csvText)
    return { ok: true as const, preview }
  } catch (error) {
    return fail(error)
  }
}

export async function commitImportAction(kind: ImportKind, csvText: string) {
  try {
    const db = await getDb()
    const preview = await previewCsv(db, kind, csvText)
    await commitPreview(db, preview)
    await refresh()
    return {
      ok: true as const,
      newCount: preview.newCount,
      updateCount: preview.updateCount,
    }
  } catch (error) {
    return fail(error)
  }
}

export async function previewTinyOpportunitiesAction() {
  try {
    const preview = await previewCsv(await getDb(), "opportunities", TINY_OPPORTUNITIES_CSV)
    return { ok: true as const, preview, csv: TINY_OPPORTUNITIES_CSV }
  } catch (error) {
    return fail(error)
  }
}

export async function loadSyntheticDatasetAction() {
  try {
    const db = await getDb()
    await ensureCanonicalPlays(db)
    const loaded = await loadSyntheticDataset(db)
    await refresh()
    return { ok: true as const, ...loaded }
  } catch (error) {
    return fail(error)
  }
}

export async function syntheticCsvAction() {
  return syntheticCsvBundle()
}
