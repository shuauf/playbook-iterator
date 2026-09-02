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
