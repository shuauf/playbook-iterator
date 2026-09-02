export type PlayStatus = "active" | "retired"
export type PrerequisiteIntent = "required" | "recommended"
export type FindingLabel =
  | "enforce"
  | "retire"
  | "reclassify"
  | "investigate"
  | "insufficient"

export type Prerequisite = {
  id: string
  text: string
  intent: PrerequisiteIntent
}

export type Play = {
  id: string
  name: string
  status: PlayStatus
  typicalStage: string
  purpose: string
  lastMaterialChange: string
  historyNote: string
  prerequisites: Prerequisite[]
}

export type ExceptionReason = {
  id: string
  label: string
  description: string
  active: boolean
}

export type Opportunity = {
  id: string
  name: string
  account: string
  segment: "SMB" | "Mid-market" | "Enterprise"
  stage: string
  se: string
  status: "open" | "won" | "lost"
  created: string
}

export type OutcomeQueueItem = {
  id: string
  type: "advancement" | "close"
  opportunity: string
  play: string
  se: string
  runDate: string
  detail: string
}

export type Finding = {
  id: string
  label: FindingLabel
  title: string
  playId: string
  playName: string
  prerequisite: string
  summary: string
  nMet: number
  nUnmet: number
  winMet: number
  winUnmet: number
  advMet: number
  advUnmet: number
  skipRate: number
  confidence: "High" | "Medium" | "Low"
  limitation: string
}

export type PlayMetric = {
  play: string
  typicalStage: string
  runs: number
  exceptionRate: number
  closed: number
  winRate: number | null
  note?: string
}

export const workspace = {
  team: "Northstar SE",
  subtitle: "Standards stay explicit. Exceptions stay inspectable.",
}

export const plays: Play[] = [
  {
    id: "discovery",
    name: "Discovery",
    status: "active",
    typicalStage: "Qualify",
    purpose:
      "Establish the business problem, stakeholders, and whether SE involvement is justified. This is the team's default first technical conversation.",
    lastMaterialChange: "Feb 2026 — added ‘opportunity justifies SE effort’.",
    historyNote:
      "12 earlier runs used a shorter prerequisite list. Those runs still show the definition in force at the time.",
    prerequisites: [
      {
        id: "d1",
        text: "AE and SE have aligned on the meeting objective",
        intent: "required",
      },
      {
        id: "d2",
        text: "A champion or accountable stakeholder is expected in the room",
        intent: "recommended",
      },
      {
        id: "d3",
        text: "The opportunity justifies the expected level of SE effort",
        intent: "required",
      },
    ],
  },
  {
    id: "discovery-demo",
    name: "Discovery Demo",
    status: "active",
    typicalStage: "Qualify",
    purpose:
      "A short, problem-led walkthrough used only to confirm that the problem is real and that the product is relevant enough to continue.",
    lastMaterialChange: "Jan 2026 — split from Product Demo.",
    historyNote:
      "Runs logged against Product Demo before this split remain Product Demo runs.",
    prerequisites: [
      {
        id: "dd1",
        text: "The business problem is understood at a working level",
        intent: "required",
      },
      {
        id: "dd2",
        text: "Audience and their priorities are known",
        intent: "required",
      },
      {
        id: "dd3",
        text: "Scope is limited to confirming relevance, not a full tour",
        intent: "required",
      },
    ],
  },
  {
    id: "product-demo",
    name: "Product Demo",
    status: "active",
    typicalStage: "Evaluate",
    purpose:
      "A working-product walkthrough for a known business problem and a named audience. Used when discovery is complete enough to show relevant capability — not a tour.",
    lastMaterialChange:
      "Mar 2026 — ‘Champion or accountable stakeholder’ moved from required to recommended.",
    historyNote:
      "41 prior runs remain attached to the required version. This Config page shows the current hypothesis, not a rewrite of those runs.",
    prerequisites: [
      {
        id: "pd1",
        text: "The SE has completed direct discovery",
        intent: "required",
      },
      {
        id: "pd2",
        text: "The business problem is understood",
        intent: "required",
      },
      {
        id: "pd3",
        text: "The audience and their priorities are known",
        intent: "required",
      },
      {
        id: "pd4",
        text: "AE and SE have aligned on the meeting objective",
        intent: "required",
      },
      {
        id: "pd5",
        text: "A champion or accountable stakeholder is involved",
        intent: "recommended",
      },
      {
        id: "pd6",
        text: "The opportunity justifies the expected level of SE effort",
        intent: "recommended",
      },
    ],
  },
  {
    id: "solutions-demo",
    name: "Solutions Demo",
    status: "active",
    typicalStage: "Evaluate",
    purpose:
      "A scenario-based demonstration mapped to the customer's environment and success criteria, not a feature inventory.",
    lastMaterialChange: "Nov 2025 — added success-criteria prerequisite.",
    historyNote: "No version collisions in the sample set.",
    prerequisites: [
      {
        id: "sd1",
        text: "The business problem is understood",
        intent: "required",
      },
      {
        id: "sd2",
        text: "Technical risks have been identified",
        intent: "recommended",
      },
      {
        id: "sd3",
        text: "The customer has agreed to success criteria",
        intent: "required",
      },
    ],
  },
  {
    id: "architecture-deep-dive",
    name: "Architecture Deep Dive",
    status: "active",
    typicalStage: "Validate",
    purpose:
      "A technical design conversation with the people who will own risk, integration, and operating model.",
    lastMaterialChange: "Dec 2025 — marked technical-risk identification recommended.",
    historyNote:
      "Results currently flags this recommended item for reclassification.",
    prerequisites: [
      {
        id: "ad1",
        text: "The SE has completed direct discovery",
        intent: "required",
      },
      {
        id: "ad2",
        text: "Technical risks have been identified",
        intent: "recommended",
      },
      {
        id: "ad3",
        text: "Audience includes technical owners, not only champions",
        intent: "required",
      },
    ],
  },
  {
    id: "technical-workshop",
    name: "Technical Workshop",
    status: "active",
    typicalStage: "Validate",
    purpose:
      "A working session to pressure-test architecture, constraints, and implementation path with the customer's technical team.",
    lastMaterialChange: "Oct 2025 — initial definition.",
    historyNote: "Stable since introduction.",
    prerequisites: [
      {
        id: "tw1",
        text: "Technical risks have been identified",
        intent: "required",
      },
      {
        id: "tw2",
        text: "The customer has agreed to success criteria",
        intent: "required",
      },
      {
        id: "tw3",
        text: "A champion or accountable stakeholder is involved",
        intent: "required",
      },
    ],
  },
  {
    id: "custom-demo",
    name: "Custom Demo",
    status: "active",
    typicalStage: "Evaluate",
    purpose:
      "A tailored demonstration against a specific environment or dataset. Expensive. Used when a standard product demo cannot answer the remaining question.",
    lastMaterialChange: "Feb 2026 — added environment-prepared prerequisite.",
    historyNote:
      "Too few closed runs in the sample set for a recommendation. See Results.",
    prerequisites: [
      {
        id: "cd1",
        text: "The business problem is understood",
        intent: "required",
      },
      {
        id: "cd2",
        text: "A standard product demo cannot answer the remaining question",
        intent: "required",
      },
      {
        id: "cd3",
        text: "The unique environment or dataset is prepared",
        intent: "required",
      },
    ],
  },
  {
    id: "proof-of-concept",
    name: "Proof of Concept",
    status: "active",
    typicalStage: "Prove",
    purpose:
      "A time-boxed evaluation against agreed success criteria. Occurs late by design. Do not compare cycle time or win rate to earlier plays.",
    lastMaterialChange: "Jan 2026 — success criteria made required.",
    historyNote:
      "High observed win rate is expected at this stage and is not treated as evidence that POCs ‘cause’ wins.",
    prerequisites: [
      {
        id: "poc1",
        text: "The customer has agreed to success criteria",
        intent: "required",
      },
      {
        id: "poc2",
        text: "Technical risks have been identified",
        intent: "required",
      },
      {
        id: "poc3",
        text: "A champion or accountable stakeholder is involved",
        intent: "required",
      },
      {
        id: "poc4",
        text: "The opportunity justifies the expected level of SE effort",
        intent: "required",
      },
    ],
  },
  {
    id: "lunch-and-learn",
    name: "Lunch and Learn",
    status: "retired",
    typicalStage: "Qualify",
    purpose:
      "Informal education session. Retired because it was used as a substitute for discovery and produced noisy exception data.",
    lastMaterialChange: "Retired 12 Jan 2026.",
    historyNote:
      "18 historical runs remain inspectable against this definition. New runs cannot be logged.",
    prerequisites: [
      {
        id: "ll1",
        text: "AE and SE have aligned on the meeting objective",
        intent: "recommended",
      },
    ],
  },
]

export const exceptionReasons: ExceptionReason[] = [
  {
    id: "ae-pressure",
    label: "AE pressure",
    description: "The account executive asked to proceed despite unmet prerequisites.",
    active: true,
  },
  {
    id: "timeline",
    label: "Timeline compression",
    description: "The prospect’s timeline did not allow the standard sequence.",
    active: true,
  },
  {
    id: "refusal",
    label: "Prospect refusal",
    description: "The customer declined a discovery or prerequisite conversation.",
    active: true,
  },
  {
    id: "technical-audience",
    label: "Technical audience",
    description: "The room was assumed to already understand the problem and product.",
    active: true,
  },
  {
    id: "existing-relationship",
    label: "Existing relationship",
    description: "Prior working history was treated as a substitute for current discovery.",
    active: true,
  },
  {
    id: "resourcing",
    label: "Resourcing constraints",
    description: "Staffing or calendar limits prevented the standard preparation.",
    active: true,
  },
  {
    id: "no-owner",
    label: "No clear owner",
    description: "Nobody owned the prerequisite, so the play ran anyway.",
    active: true,
  },
  {
    id: "other",
    label: "Other",
    description: "Requires a written note.",
    active: true,
  },
]

export const opportunities: Opportunity[] = [
  {
    id: "opp-meridian",
    name: "Meridian Health — platform expansion",
    account: "Meridian Health",
    segment: "Enterprise",
    stage: "Evaluate",
    se: "Maya Chen",
    status: "open",
    created: "12 May 2026",
  },
  {
    id: "opp-northwind",
    name: "Northwind Logistics — yard visibility",
    account: "Northwind Logistics",
    segment: "Mid-market",
    stage: "Qualify",
    se: "Jordan Hale",
    status: "open",
    created: "3 Jun 2026",
  },
  {
    id: "opp-helios",
    name: "Helios Cloud — security review",
    account: "Helios Cloud",
    segment: "Enterprise",
    stage: "Validate",
    se: "Priya Shah",
    status: "open",
    created: "18 Apr 2026",
  },
  {
    id: "opp-brightpath",
    name: "Brightpath Credit Union — branch ops",
    account: "Brightpath Credit Union",
    segment: "SMB",
    stage: "Evaluate",
    se: "Alex Rivera",
    status: "open",
    created: "22 Jun 2026",
  },
  {
    id: "opp-atlas",
    name: "Atlas Freight — closed-won Q2",
    account: "Atlas Freight",
    segment: "Mid-market",
    stage: "Closed won",
    se: "Maya Chen",
    status: "won",
    created: "9 Jan 2026",
  },
  {
    id: "opp-lumen",
    name: "Lumen Analytics — closed-lost",
    account: "Lumen Analytics",
    segment: "Enterprise",
    stage: "Closed lost",
    se: "Jordan Hale",
    status: "lost",
    created: "2 Feb 2026",
  },
]

export const outcomeQueue: OutcomeQueueItem[] = [
  {
    id: "q1",
    type: "advancement",
    opportunity: "Meridian Health — platform expansion",
    play: "Product Demo",
    se: "Maya Chen",
    runDate: "28 Aug 2026",
    detail: "Two exceptions logged. Advancement after the demo is still unanswered.",
  },
  {
    id: "q2",
    type: "advancement",
    opportunity: "Brightpath Credit Union — branch ops",
    play: "Discovery Demo",
    se: "Alex Rivera",
    runDate: "30 Aug 2026",
    detail: "Clean run. Did the opportunity move to Evaluate?",
  },
  {
    id: "q3",
    type: "close",
    opportunity: "Helios Cloud — security review",
    play: "Architecture Deep Dive",
    se: "Priya Shah",
    runDate: "4 Aug 2026",
    detail: "Advanced after the deep dive. Close result is still open.",
  },
  {
    id: "q4",
    type: "close",
    opportunity: "Northwind Logistics — yard visibility",
    play: "Discovery",
    se: "Jordan Hale",
    runDate: "11 Jul 2026",
    detail: "Did not advance. Confirm whether this opportunity closed lost or is still working.",
  },
]

export const findings: Finding[] = [
  {
    id: "f-enforce",
    label: "enforce",
    title: "Enforce more strictly",
    playId: "product-demo",
    playName: "Product Demo",
    prerequisite: "The business problem is understood",
    summary:
      "This required prerequisite is skipped often, and unmet Product Demo runs close won at a much lower rate.",
    nMet: 62,
    nUnmet: 22,
    winMet: 0.61,
    winUnmet: 0.28,
    advMet: 0.74,
    advUnmet: 0.41,
    skipRate: 0.26,
    confidence: "High",
    limitation:
      "Observational and within Product Demo only. Deals that skip this step may already be lower quality. This is not proof that the prerequisite causes wins.",
  },
  {
    id: "f-retire",
    label: "retire",
    title: "Consider retiring",
    playId: "product-demo",
    playName: "Product Demo",
    prerequisite: "A champion or accountable stakeholder is involved",
    summary:
      "Skipped on nearly a third of Product Demos, with no material difference in advancement or win rate in this sample.",
    nMet: 58,
    nUnmet: 26,
    winMet: 0.53,
    winUnmet: 0.5,
    advMet: 0.66,
    advUnmet: 0.64,
    skipRate: 0.31,
    confidence: "High",
    limitation:
      "Evidence of no material effect inside a ±5pp window, not merely ‘not statistically significant.’ Still specific to this play and this time window.",
  },
  {
    id: "f-reclassify",
    label: "reclassify",
    title: "Reclassify",
    playId: "architecture-deep-dive",
    playName: "Architecture Deep Dive",
    prerequisite: "Technical risks have been identified",
    summary:
      "Marked recommended, but unmet runs advance and win at a substantially lower rate. It is behaving like a required gate.",
    nMet: 31,
    nUnmet: 14,
    winMet: 0.71,
    winUnmet: 0.36,
    advMet: 0.81,
    advUnmet: 0.43,
    skipRate: 0.31,
    confidence: "Medium",
    limitation:
      "Per-arm sample is only just above the directional floor. Worth a playbook decision, not an automatic promotion.",
  },
  {
    id: "f-investigate",
    label: "investigate",
    title: "Investigate",
    playId: "proof-of-concept",
    playName: "Proof of Concept",
    prerequisite: "The customer has agreed to success criteria",
    summary:
      "Directionally worse when unmet, but the unmet arm is still small and POCs already sit late in the cycle.",
    nMet: 28,
    nUnmet: 9,
    winMet: 0.82,
    winUnmet: 0.56,
    advMet: 0.86,
    advUnmet: 0.67,
    skipRate: 0.24,
    confidence: "Low",
    limitation:
      "Do not read POC win rate against Discovery or Product Demo. This finding stays inside Proof of Concept and remains directional.",
  },
  {
    id: "f-insufficient",
    label: "insufficient",
    title: "Insufficient data",
    playId: "custom-demo",
    playName: "Custom Demo",
    prerequisite: "The unique environment or dataset is prepared",
    summary:
      "The skip pattern is interesting, but there are not enough closed Custom Demo runs to recommend a playbook change.",
    nMet: 7,
    nUnmet: 4,
    winMet: 0.57,
    winUnmet: 0.25,
    advMet: 0.71,
    advUnmet: 0.5,
    skipRate: 0.36,
    confidence: "Low",
    limitation:
      "Below the sample-size floor. The system will not promote this to enforce, retire, or reclassify until more closed runs exist.",
  },
]

export const playMetrics: PlayMetric[] = [
  {
    play: "Discovery",
    typicalStage: "Qualify",
    runs: 120,
    exceptionRate: 0.18,
    closed: 88,
    winRate: 0.41,
    note: "Earlier-stage baseline. Not comparable to POC.",
  },
  {
    play: "Discovery Demo",
    typicalStage: "Qualify",
    runs: 64,
    exceptionRate: 0.22,
    closed: 41,
    winRate: 0.44,
  },
  {
    play: "Product Demo",
    typicalStage: "Evaluate",
    runs: 84,
    exceptionRate: 0.31,
    closed: 84,
    winRate: 0.52,
  },
  {
    play: "Solutions Demo",
    typicalStage: "Evaluate",
    runs: 39,
    exceptionRate: 0.21,
    closed: 30,
    winRate: 0.57,
  },
  {
    play: "Architecture Deep Dive",
    typicalStage: "Validate",
    runs: 45,
    exceptionRate: 0.29,
    closed: 36,
    winRate: 0.61,
  },
  {
    play: "Technical Workshop",
    typicalStage: "Validate",
    runs: 22,
    exceptionRate: 0.14,
    closed: 16,
    winRate: 0.63,
  },
  {
    play: "Custom Demo",
    typicalStage: "Evaluate",
    runs: 11,
    exceptionRate: 0.36,
    closed: 11,
    winRate: 0.45,
    note: "Insufficient closed volume for play-level claims.",
  },
  {
    play: "Proof of Concept",
    typicalStage: "Prove",
    runs: 40,
    exceptionRate: 0.12,
    closed: 37,
    winRate: 0.78,
    note: "Late-stage by design. Higher win rate is expected, not a play ranking.",
  },
]

export const skipRates = [
  {
    play: "Product Demo",
    prerequisite: "The business problem is understood",
    intent: "Required",
    skipRate: 0.26,
    n: 84,
  },
  {
    play: "Product Demo",
    prerequisite: "A champion or accountable stakeholder is involved",
    intent: "Recommended",
    skipRate: 0.31,
    n: 84,
  },
  {
    play: "Product Demo",
    prerequisite: "The SE has completed direct discovery",
    intent: "Required",
    skipRate: 0.19,
    n: 84,
  },
  {
    play: "Architecture Deep Dive",
    prerequisite: "Technical risks have been identified",
    intent: "Recommended",
    skipRate: 0.31,
    n: 45,
  },
  {
    play: "Proof of Concept",
    prerequisite: "The customer has agreed to success criteria",
    intent: "Required",
    skipRate: 0.24,
    n: 37,
  },
]

export const exceptionReasonPerformance = [
  { reason: "AE pressure", n: 34, winRate: 0.32, note: "Worst observed reason in-sample." },
  { reason: "Timeline compression", n: 29, winRate: 0.41 },
  { reason: "Technical audience", n: 22, winRate: 0.5, note: "Often paired with skipped discovery." },
  { reason: "Existing relationship", n: 18, winRate: 0.56 },
  { reason: "Prospect refusal", n: 15, winRate: 0.27 },
  { reason: "Resourcing constraints", n: 11, winRate: 0.45 },
  { reason: "No clear owner", n: 9, winRate: 0.22 },
  { reason: "Other", n: 7, winRate: 0.43 },
]

export const stackedExceptions = [
  { stack: "No exceptions", n: 48, winRate: 0.64, advRate: 0.77 },
  { stack: "One exception", n: 22, winRate: 0.49, advRate: 0.59 },
  { stack: "Two or more", n: 14, winRate: 0.31, advRate: 0.36 },
]

export const importPreviewRows = [
  {
    row: 2,
    opportunity: "Meridian Health — platform expansion",
    play: "Product Demo",
    status: "valid" as const,
    message: "Ready to import",
  },
  {
    row: 3,
    opportunity: "Brightpath Credit Union — branch ops",
    play: "Discovery Demo",
    status: "valid" as const,
    message: "Ready to import",
  },
  {
    row: 4,
    opportunity: "Unknown account",
    play: "Product Demo",
    status: "error" as const,
    message: "Opportunity id is missing. Import will not run until this row is fixed.",
  },
]
