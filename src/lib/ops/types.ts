import type { OpportunityStatus, PrerequisiteIntent } from "@/lib/playbook/types"

export type OpportunityDto = {
  id: string
  externalId: string
  name: string
  account: string
  segment: string
  se: string
  stage: string
  status: OpportunityStatus
  createdAt: string
  createdAtMs: number
  advanced: boolean | null
  advancedOn: string | null
  advancedOnMs: number | null
  closeDate: string | null
  closeDateMs: number | null
}

export type CheckInput = {
  prerequisiteId: string
  met: boolean
  exceptionReasonId?: string
  note?: string
  approver?: string
}

export type PrerequisiteCheckDto = {
  id: string
  prerequisiteId: string
  prerequisiteVersionId: string
  text: string
  intent: PrerequisiteIntent
  met: boolean
  exceptionReasonId: string | null
  exceptionReasonLabel: string | null
  note: string | null
  approver: string | null
  currentText: string | null
  prerequisiteStatus: "active" | "retired"
}

export type PlayRunDto = {
  id: string
  externalId: string
  opportunityId: string
  opportunityName: string
  opportunityAccount: string
  opportunityStatus: OpportunityStatus
  playId: string
  playName: string
  typicalStage: string
  definitionVersion: number
  stageAtRun: string
  runAt: string
  runAtMs: number
  exceptionCount: number
  daysToAdvancement: number | null
  daysToClose: number | null
  advanced: boolean | null
  closeStatus: OpportunityStatus
  checks: PrerequisiteCheckDto[]
}

export type OutcomeQueueItemDto = {
  opportunityId: string
  type: "advancement" | "close"
  opportunityName: string
  account: string
  se: string
  stage: string
  latestPlayName: string
  latestRunAt: string
  detail: string
}
