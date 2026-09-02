import type {
  AnalysisInput,
  AnalysisOpportunity,
  AnalysisResult,
  AnalysisRun,
  PrerequisiteFinding,
} from "@/analysis/types"
import { addDays } from "@/lib/dates"

const BASE = new Date(2026, 0, 8)

function at(days: number) {
  return addDays(BASE, days).getTime()
}

function opp(
  id: string,
  status: AnalysisOpportunity["status"],
  advanced: boolean | null,
  opts?: Partial<AnalysisOpportunity>
): AnalysisOpportunity {
  const closeOffset = status === "open" ? null : 70
  return {
    id,
    name: opts?.name ?? id,
    account: opts?.account ?? "Northstar sample",
    segment: opts?.segment ?? "Mid-market",
    se: opts?.se ?? "Maya Chen",
    stage: status === "won" ? "Closed won" : status === "lost" ? "Closed lost" : "Evaluate",
    status,
    createdAtMs: at(0),
    advanced,
    advancedOnMs: advanced ? at(28) : advanced === false ? at(21) : null,
    closeDateMs: closeOffset === null ? null : at(closeOffset),
    ...opts,
  }
}

function check(
  prerequisiteId: string,
  text: string,
  intent: "required" | "recommended",
  met: boolean,
  reason?: string
) {
  return {
    prerequisiteId,
    text,
    intent,
    met,
    reasonId: met ? null : (reason ?? "ae-pressure"),
    reasonLabel: met ? null : reason === "timeline" ? "Timeline compression" : "AE pressure",
  }
}

function run(
  id: string,
  opportunityId: string,
  play: { id: string; name: string; stage: string },
  runAtMs: number,
  checks: AnalysisRun["checks"]
): AnalysisRun {
  return {
    id,
    opportunityId,
    playId: play.id,
    playName: play.name,
    typicalStage: play.stage,
    runAtMs,
    checks,
  }
}

const PD = { id: "product-demo", name: "Product Demo", stage: "Evaluate" }
const CD = { id: "custom-demo", name: "Custom Demo", stage: "Evaluate" }
const ADD = { id: "architecture-deep-dive", name: "Architecture Deep Dive", stage: "Validate" }
const DISC = { id: "discovery", name: "Discovery", stage: "Qualify" }
const POC = { id: "proof-of-concept", name: "Proof of Concept", stage: "Prove" }

const PD_DISC = "pd-direct-discovery"
const PD_PROB = "pd-business-problem"
const PD_CHAMP = "pd-champion"

function productDemoChecks(businessMet: boolean, championMet: boolean, discoveryMet = true) {
  return [
    check(PD_DISC, "The SE has completed direct discovery", "required", discoveryMet, "resourcing"),
    check(PD_PROB, "The business problem is understood", "required", businessMet, "ae-pressure"),
    check(PD_CHAMP, "A champion or accountable stakeholder is involved", "recommended", championMet, "timeline"),
  ]
}

/**
 * Deterministic corpus with planted patterns:
 * - Product Demo / business problem: large supported win-rate gap
 * - Product Demo / champion: no meaningful difference, skipped often
 * - Custom Demo / environment: eight observations, large gap
 * - Architecture Deep Dive / technical risks: recommended with supported harm
 * - Discovery vs POC: later-stage looks better, must stay grouped
 */
export function buildPlantedCorpus(): AnalysisInput {
  const opportunities: AnalysisOpportunity[] = []
  const runs: AnalysisRun[] = []

  function addClosed(
    prefix: string,
    count: number,
    status: "won" | "lost",
    businessMet: boolean,
    championUnmetCount: number,
    start: number
  ) {
    for (let i = 0; i < count; i++) {
      const id = `${prefix}-${i + 1}`
      const championMet = i >= championUnmetCount
      const advanced = status === "won"
      opportunities.push(
        opp(id, status, advanced, {
          name: `${prefix} ${i + 1}`,
          segment: i % 3 === 0 ? "Enterprise" : i % 3 === 1 ? "Mid-market" : "SMB",
          closeDateMs: at(start + i + (status === "won" ? 55 : 40)),
          advancedOnMs: advanced ? at(start + i + 18) : at(start + i + 12),
        })
      )
      runs.push(
        run(
          `run-${id}`,
          id,
          PD,
          at(start + i),
          productDemoChecks(businessMet, championMet, i % 7 !== 0)
        )
      )
    }
  }

  // Closed Product Demo: 46 won / 46 lost. Business problem drives wins.
  // Champion skip is balanced so win rate stays ~50% vs ~50%.
  addClosed("pd-prob-met-won", 40, "won", true, 8, 10)
  addClosed("pd-prob-met-lost", 22, "lost", true, 14, 20)
  addClosed("pd-prob-unmet-won", 6, "won", false, 6, 40)
  addClosed("pd-prob-unmet-lost", 24, "lost", false, 0, 50)

  // Open opportunities — must not affect win rate
  for (let i = 0; i < 12; i++) {
    const id = `pd-open-${i + 1}`
    opportunities.push(
      opp(id, "open", null, {
        name: `Open Product Demo ${i + 1}`,
        stage: "Evaluate",
        closeDateMs: null,
      })
    )
    runs.push(
      run(`run-${id}`, id, PD, at(80 + i), productDemoChecks(i % 3 !== 0, i % 2 === 0))
    )
  }

  // Custom Demo: exactly eight closed observations, 100% vs 0%
  for (let i = 0; i < 4; i++) {
    const id = `cd-met-${i + 1}`
    opportunities.push(opp(id, "won", true, { name: `Custom Demo met ${i + 1}`, stage: "Evaluate" }))
    runs.push(
      run(`run-${id}`, id, CD, at(30 + i), [
        check("cd-env", "The unique environment or dataset is prepared", "required", true),
      ])
    )
  }
  for (let i = 0; i < 4; i++) {
    const id = `cd-unmet-${i + 1}`
    opportunities.push(opp(id, "lost", false, { name: `Custom Demo unmet ${i + 1}`, stage: "Evaluate" }))
    runs.push(
      run(`run-${id}`, id, CD, at(34 + i), [
        check("cd-env", "The unique environment or dataset is prepared", "required", false, "timeline"),
      ])
    )
  }

  // Architecture Deep Dive, recommended prereq with supported harm
  for (let i = 0; i < 18; i++) {
    const id = `add-met-won-${i + 1}`
    opportunities.push(opp(id, "won", true, { name: `ADD met won ${i + 1}`, stage: "Validate" }))
    runs.push(run(`run-${id}`, id, ADD, at(12 + i), [
      check("ad-risks", "Technical risks have been identified", "recommended", true),
    ]))
  }
  for (let i = 0; i < 7; i++) {
    const id = `add-met-lost-${i + 1}`
    opportunities.push(opp(id, "lost", false, { name: `ADD met lost ${i + 1}`, stage: "Validate" }))
    runs.push(run(`run-${id}`, id, ADD, at(40 + i), [
      check("ad-risks", "Technical risks have been identified", "recommended", true),
    ]))
  }
  for (let i = 0; i < 7; i++) {
    const id = `add-unmet-won-${i + 1}`
    opportunities.push(opp(id, "won", true, { name: `ADD unmet won ${i + 1}`, stage: "Validate" }))
    runs.push(run(`run-${id}`, id, ADD, at(20 + i), [
      check("ad-risks", "Technical risks have been identified", "recommended", false, "technical-audience"),
    ]))
  }
  for (let i = 0; i < 13; i++) {
    const id = `add-unmet-lost-${i + 1}`
    opportunities.push(opp(id, "lost", false, { name: `ADD unmet lost ${i + 1}`, stage: "Validate" }))
    runs.push(run(`run-${id}`, id, ADD, at(55 + i), [
      check("ad-risks", "Technical risks have been identified", "recommended", false, "technical-audience"),
    ]))
  }

  // Discovery vs POC — later stage looks better
  for (let i = 0; i < 20; i++) {
    const id = `disc-won-${i + 1}`
    opportunities.push(
      opp(id, "won", true, {
        name: `Discovery won ${i + 1}`,
        stage: "Qualify",
        closeDateMs: at(12 + i + 90),
        advancedOnMs: at(12 + i + 30),
      })
    )
    runs.push(run(`run-${id}`, id, DISC, at(12 + i), [
      check("d-aligned", "AE and SE have aligned on the meeting objective", "required", true),
    ]))
  }
  for (let i = 0; i < 30; i++) {
    const id = `disc-lost-${i + 1}`
    opportunities.push(
      opp(id, "lost", false, {
        name: `Discovery lost ${i + 1}`,
        stage: "Qualify",
        closeDateMs: at(20 + i + 50),
      })
    )
    runs.push(run(`run-${id}`, id, DISC, at(20 + i), [
      check("d-aligned", "AE and SE have aligned on the meeting objective", "required", i % 5 !== 0, "refusal"),
    ]))
  }
  for (let i = 0; i < 32; i++) {
    const id = `poc-won-${i + 1}`
    opportunities.push(
      opp(id, "won", true, {
        name: `POC won ${i + 1}`,
        stage: "Prove",
        closeDateMs: at(60 + i + 18),
        advancedOnMs: at(60 + i + 8),
      })
    )
    runs.push(run(`run-${id}`, id, POC, at(60 + i), [
      check("poc-criteria", "The customer has agreed to success criteria", "required", true),
    ]))
  }
  for (let i = 0; i < 8; i++) {
    const id = `poc-lost-${i + 1}`
    opportunities.push(
      opp(id, "lost", true, {
        name: `POC lost ${i + 1}`,
        stage: "Prove",
        closeDateMs: at(70 + i + 16),
      })
    )
    runs.push(run(`run-${id}`, id, POC, at(70 + i), [
      check("poc-criteria", "The customer has agreed to success criteria", "required", i > 4, "timeline"),
    ]))
  }

  return { opportunities, runs }
}

export function findingByPrereq(
  result: AnalysisResult,
  playId: string,
  prerequisiteId: string
): PrerequisiteFinding | undefined {
  return result.findings.find(
    (item) => item.playId === playId && item.prerequisiteId === prerequisiteId
  )
}
