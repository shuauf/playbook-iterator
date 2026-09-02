export type PlayStatus = "active" | "retired"
export type PrerequisiteIntent = "required" | "recommended"

export type PlaybookEventDto = {
  id: string
  summary: string
  at: string
}

export type PrerequisiteDto = {
  id: string
  playId: string
  text: string
  intent: PrerequisiteIntent
  sortOrder: number
  status: PlayStatus
  currentVersionId: string
  version: number
}

export type PlayDto = {
  id: string
  name: string
  typicalStage: string
  purpose: string
  status: PlayStatus
  definitionVersion: number
  prerequisites: PrerequisiteDto[]
  history: PlaybookEventDto[]
}

export type ExceptionReasonDto = {
  id: string
  label: string
  description: string
  sortOrder: number
  status: PlayStatus
}

export const TYPICAL_STAGES = [
  "Qualify",
  "Evaluate",
  "Validate",
  "Prove",
] as const

export type TypicalStage = (typeof TYPICAL_STAGES)[number]

export const SEGMENTS = ["SMB", "Mid-market", "Enterprise"] as const
export type Segment = (typeof SEGMENTS)[number]

export const OPPORTUNITY_STATUSES = ["open", "won", "lost"] as const
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number]
