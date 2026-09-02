import type { OpportunityStatus, PrerequisiteIntent } from "@/lib/playbook/types"

export type EvidenceStrength =
  | "insufficient"
  | "directional"
  | "supported"
  | "no-difference"

export type RecommendationLabel =
  | "enforce"
  | "retire"
  | "reclassify"
  | "investigate"
  | "insufficient"

export type AnalysisOpportunity = {
  id: string
  name: string
  account: string
  segment: string
  se: string
  stage: string
  status: OpportunityStatus
  createdAtMs: number
  advanced: boolean | null
  advancedOnMs: number | null
  closeDateMs: number | null
}

export type AnalysisCheck = {
  prerequisiteId: string
  text: string
  intent: PrerequisiteIntent
  met: boolean
  reasonId: string | null
  reasonLabel: string | null
}

export type AnalysisRun = {
  id: string
  opportunityId: string
  playId: string
  playName: string
  typicalStage: string
  runAtMs: number
  checks: AnalysisCheck[]
}

export type AnalysisInput = {
  opportunities: AnalysisOpportunity[]
  runs: AnalysisRun[]
}

export type AnalysisFilters = {
  playId?: string
  typicalStage?: string
  segment?: string
  fromMs?: number
  toMs?: number
}

export type Thresholds = {
  minArmInsufficient: number
  minArmSupported: number
  materialPp: number
  equivalencePp: number
  minSkipForRetire: number
}

export type RateComparison = {
  nMet: number
  nUnmet: number
  successesMet: number
  successesUnmet: number
  rateMet: number | null
  rateUnmet: number | null
  diff: number | null
  ciLo: number | null
  ciHi: number | null
  strength: EvidenceStrength
}

export type CycleComparison = {
  nMet: number
  nUnmet: number
  medianMet: number | null
  medianUnmet: number | null
  diff: number | null
  ciLo: number | null
  ciHi: number | null
  strength: EvidenceStrength
}

export type PrerequisiteFinding = {
  id: string
  playId: string
  playName: string
  typicalStage: string
  prerequisiteId: string
  prerequisite: string
  intent: PrerequisiteIntent
  skipRate: number
  nRuns: number
  nMet: number
  nUnmet: number
  exception: RateComparison
  win: RateComparison
  advancement: RateComparison
  wonCycle: CycleComparison
  recommendation: RecommendationLabel
  evidence: EvidenceStrength
  summary: string
  why: string
  limitation: string
  recordIds: string[]
}

export type FindingEvidenceRow = {
  runId: string
  opportunityId: string
  opportunityName: string
  account: string
  status: AnalysisOpportunity["status"]
  met: boolean
  reasonLabel: string | null
  runAtMs: number
}

export type PlayOutcomeRow = {
  playId: string
  playName: string
  typicalStage: string
  runs: number
  opportunities: number
  closed: number
  open: number
  exceptionRate: number
  winRate: number | null
  nWin: number
  advancementRate: number | null
  nAdvancement: number
  medianDaysToAdvance: number | null
  nAdvanceDays: number
  medianDaysToCloseWon: number | null
  nWonCycle: number
  note: string
}

export type ReasonOutcomeRow = {
  reasonId: string
  reason: string
  n: number
  closed: number
  winRate: number | null
  advancementRate: number | null
}

export type StackedExceptionRow = {
  stack: "none" | "one" | "multiple"
  label: string
  n: number
  closed: number
  winRate: number | null
  nWin: number
  advancementRate: number | null
  nAdvancement: number
}

export type IntentExceptionRow = {
  intent: PrerequisiteIntent
  checks: number
  unmet: number
  skipRate: number
  closedUnmet: number
  winRateWhenUnmet: number | null
}

export type TrendRow = {
  month: string
  monthMs: number
  runs: number
  exceptionRate: number
  closed: number
  winRate: number | null
}

export type SecondaryReport = {
  playsByStage: { stage: string; rows: PlayOutcomeRow[] }[]
  reasonOutcomes: ReasonOutcomeRow[]
  stackedExceptions: StackedExceptionRow[]
  intentExceptions: IntentExceptionRow[]
  trends: TrendRow[]
  stageCaveat: string
}

export type AnalysisResult = {
  findings: PrerequisiteFinding[]
  metrics: PrerequisiteFinding[]
  secondary: SecondaryReport
  filters: AnalysisFilters
  thresholds: Thresholds
}
