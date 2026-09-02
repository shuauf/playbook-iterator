"use server"

import { revalidatePath } from "next/cache"

import { getDb } from "@/lib/db"
import {
  addPrerequisite,
  createPlay,
  createReason,
  listPlays,
  listReasons,
  reorderPrerequisite,
  setPlayStatus,
  setPrerequisiteStatus,
  setReasonStatus,
  updatePlay,
  updatePrerequisite,
  updateReason,
} from "@/lib/playbook/repo"
import type { PlayStatus, PrerequisiteIntent } from "@/lib/playbook/types"

function fail(error: unknown) {
  return {
    ok: false as const,
    error: error instanceof Error ? error.message : "Something went wrong.",
  }
}

async function refresh() {
  revalidatePath("/config")
  revalidatePath("/log")
}

export async function getPlaybookAction() {
  const db = await getDb()
  const [plays, reasons] = await Promise.all([listPlays(db), listReasons(db)])
  return { plays, reasons }
}

export async function createPlayAction(input: {
  name: string
  typicalStage: string
  purpose: string
}) {
  try {
    const id = await createPlay(await getDb(), input)
    await refresh()
    return { ok: true as const, id }
  } catch (error) {
    return fail(error)
  }
}

export async function updatePlayAction(
  playId: string,
  input: { name: string; typicalStage: string; purpose: string }
) {
  try {
    await updatePlay(await getDb(), playId, input)
    await refresh()
    return { ok: true as const }
  } catch (error) {
    return fail(error)
  }
}

export async function setPlayStatusAction(playId: string, status: PlayStatus) {
  try {
    await setPlayStatus(await getDb(), playId, status)
    await refresh()
    return { ok: true as const }
  } catch (error) {
    return fail(error)
  }
}

export async function addPrerequisiteAction(
  playId: string,
  input: { text: string; intent: PrerequisiteIntent }
) {
  try {
    const id = await addPrerequisite(await getDb(), playId, input)
    await refresh()
    return { ok: true as const, id }
  } catch (error) {
    return fail(error)
  }
}

export async function updatePrerequisiteAction(
  prerequisiteId: string,
  input: { text?: string; intent?: PrerequisiteIntent }
) {
  try {
    await updatePrerequisite(await getDb(), prerequisiteId, input)
    await refresh()
    return { ok: true as const }
  } catch (error) {
    return fail(error)
  }
}

export async function reorderPrerequisiteAction(
  prerequisiteId: string,
  direction: -1 | 1
) {
  try {
    await reorderPrerequisite(await getDb(), prerequisiteId, direction)
    await refresh()
    return { ok: true as const }
  } catch (error) {
    return fail(error)
  }
}

export async function setPrerequisiteStatusAction(
  prerequisiteId: string,
  status: PlayStatus
) {
  try {
    await setPrerequisiteStatus(await getDb(), prerequisiteId, status)
    await refresh()
    return { ok: true as const }
  } catch (error) {
    return fail(error)
  }
}

export async function createReasonAction(input: {
  label: string
  description: string
}) {
  try {
    const id = await createReason(await getDb(), input)
    await refresh()
    return { ok: true as const, id }
  } catch (error) {
    return fail(error)
  }
}

export async function updateReasonAction(
  reasonId: string,
  input: { label: string; description: string }
) {
  try {
    await updateReason(await getDb(), reasonId, input)
    await refresh()
    return { ok: true as const }
  } catch (error) {
    return fail(error)
  }
}

export async function setReasonStatusAction(
  reasonId: string,
  status: PlayStatus
) {
  try {
    await setReasonStatus(await getDb(), reasonId, status)
    await refresh()
    return { ok: true as const }
  } catch (error) {
    return fail(error)
  }
}
