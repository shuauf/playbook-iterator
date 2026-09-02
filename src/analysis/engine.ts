import {
  bootstrapMedianDiff,
  classifyCycleStrength,
  classifyRateStrength,
  median,
  rateDiffCI,
  rateLimitation,
} from "@/analysis/stats"
import { parseThresholds } from "@/analysis/thresholds"
import type {
  AnalysisFilters,
  AnalysisInput,
  AnalysisOpportunity,
  AnalysisResult,
  AnalysisRun,
  CycleComparison,
  FindingEvidenceRow,
  IntentExceptionRow,
  PlayOutcomeRow,
  PrerequisiteFinding,
  RateComparison,
  ReasonOutcomeRow,
  RecommendationLabel,
  SecondaryReport,
  StackedExceptionRow,
  Thresholds,
  TrendRow,
} from "@/analysis/types"
import { pct } from "@/lib/format"

const STAGE_CAVEAT =
  "Plays are grouped by typical stage on purpose. Later-stage plays sit closer to close, so they will often look faster and more successful. That is a property of when they happen, not evidence that the play itself is better."

function applyFilters(input: AnalysisInput, filters: AnalysisFilters) {
  const oppById = new Map(input.opportunities.map((item) => [item.id, item]))
  const runs = input.runs.filter((run) => {
    if (filters.playId && run.playId !== filters.playId) return false
    if (filters.typicalStage && run.typicalStage !== filters.typicalStage) return false
    if (filters.fromMs && run.runAtMs < filters.fromMs) return false
    if (filters.toMs && run.runAtMs > filters.toMs) return false
    if (filters.segment) {
      const opp = oppById.get(run.opportunityId)
      if (!opp || opp.segment !== filters.segment) return false
    }
    return true
  })
  const usedOppIds = new Set(runs.map((run) => run.opportunityId))
  return {
    runs,
    opportunities: input.opportunities.filter((item) => usedOppIds.has(item.id)),
    oppById,
  }
}

function latestRunPerOpportunityPlay(runs: AnalysisRun[]) {
  const map = new Map<string, AnalysisRun>()
  const sorted = [...runs].sort((a, b) => b.runAtMs - a.runAtMs)
  for (const run of sorted) {
    const key = `${run.opportunityId}::${run.playId}`
    if (!map.has(key)) map.set(key, run)
  }
  return [...map.values()]
}

function buildRate(
  nMet: number,
  nUnmet: number,
  successesMet: number,
  successesUnmet: number,
  thresholds: Thresholds
): RateComparison {
  const ci = rateDiffCI(successesMet, nMet, successesUnmet, nUnmet)
  const rateMet = nMet > 0 ? successesMet / nMet : null
  const rateUnmet = nUnmet > 0 ? successesUnmet / nUnmet : null
  return {
    nMet,
    nUnmet,
    successesMet,
    successesUnmet,
    rateMet,
    rateUnmet,
    diff: ci.diff,
    ciLo: ci.lo,
    ciHi: ci.hi,
    strength: classifyRateStrength(nMet, nUnmet, ci.diff, ci.lo, ci.hi, thresholds),
  }
}

function daysBetween(fromMs: number, toMs: number | null) {
  if (toMs === null) return null
  return Math.round((toMs - fromMs) / 86_400_000)
}

function recommend(
  intent: PrerequisiteFinding["intent"],
  skipRate: number,
  win: RateComparison,
  advancement: RateComparison,
  thresholds: Thresholds
): { label: RecommendationLabel; why: string } {
  const minWin = Math.min(win.nMet, win.nUnmet)
  const minAdv = Math.min(advancement.nMet, advancement.nUnmet)
  const harm = (metric: RateComparison) =>
    metric.diff !== null &&
    metric.diff >= thresholds.materialPp &&
    (metric.strength === "supported" || metric.strength === "directional") &&
    (metric.ciLo ?? -1) > 0
  const supportedHarm = (metric: RateComparison) =>
    metric.strength === "supported" && metric.diff !== null && metric.diff >= thresholds.materialPp && (metric.ciLo ?? -1) > 0
  const noEffect = (metric: RateComparison) => metric.strength === "no-difference"

  if (supportedHarm(win) || supportedHarm(advancement)) {
    if (intent === "recommended") {
      return {
        label: "reclassify",
        why: "Marked recommended, but closed or advancement outcomes are materially worse when it is unmet, with both arms above the supported sample floor. It is behaving like a required gate.",
      }
    }
    return {
      label: "enforce",
      why: "Required, skipped enough to matter, and unmet runs show a supported drop in win rate or advancement. Cycle time was not used for this label.",
    }
  }

  if (noEffect(win) && noEffect(advancement) && skipRate >= thresholds.minSkipForRetire) {
    return {
      label: "retire",
      why: `Skipped on ${pct(skipRate)} of runs, with no material win or advancement difference inside the ±${Math.round(thresholds.equivalencePp * 100)}pp window at the supported sample floor.`,
    }
  }

  if (intent === "required" && noEffect(win) && noEffect(advancement) && minWin >= thresholds.minArmSupported) {
    return {
      label: "reclassify",
      why: "Required, but the supported evidence shows no material association with win or advancement. Consider making it recommended rather than retiring it automatically.",
    }
  }

  if (harm(win) || harm(advancement) || (minWin >= 1 && minWin < thresholds.minArmSupported && Math.abs(win.diff ?? 0) >= thresholds.materialPp) || (minAdv >= 1 && minAdv < thresholds.minArmSupported && Math.abs(advancement.diff ?? 0) >= thresholds.materialPp)) {
    return {
      label: "investigate",
      why: "There is a noticeable met-versus-unmet gap, but the sample is still too small or the interval too wide for a playbook change. Look at the underlying records before deciding.",
    }
  }

  return {
    label: "insufficient",
    why: "There is not yet enough closed or advancement-resolved volume in both arms to recommend a playbook change.",
  }
}

function summarizeFinding(finding: Omit<PrerequisiteFinding, "summary" | "why" | "limitation" | "recommendation" | "evidence"> & { recommendation: RecommendationLabel; why: string }): string {
  const winMet = finding.win.rateMet === null ? "—" : pct(finding.win.rateMet)
  const winUnmet = finding.win.rateUnmet === null ? "—" : pct(finding.win.rateUnmet)
  if (finding.recommendation === "enforce") {
    return `Skipped on ${pct(finding.skipRate)} of ${finding.playName} runs. Closed win rate is ${winMet} when met (n = ${finding.win.nMet}) versus ${winUnmet} when unmet (n = ${finding.win.nUnmet}).`
  }
  if (finding.recommendation === "retire") {
    return `Skipped on ${pct(finding.skipRate)} of runs, with no material difference in closed win rate (${winMet} vs ${winUnmet}) or advancement.`
  }
  if (finding.recommendation === "reclassify") {
    return finding.intent === "recommended"
      ? `Marked recommended, but unmet runs close and advance at a substantially lower rate (${winMet} vs ${winUnmet} won).`
      : `Marked required, but the supported sample shows no material outcome association.`
  }
  if (finding.recommendation === "investigate") {
    return `Apparent gap: ${winMet} won when met (n = ${finding.win.nMet}) versus ${winUnmet} when unmet (n = ${finding.win.nUnmet}). The sample is not yet strong enough for a playbook change.`
  }
  return `Not enough ${finding.playName} volume in both comparison groups to recommend a change.`
}

function limitationFor(finding: PrerequisiteFinding) {
  const parts = [
    `Within ${finding.playName} only — plays are never pooled.`,
    rateLimitation(finding.win.strength, "win-rate"),
    "Open opportunities are visible in usage and excluded from win rate. Lost opportunities are included in win rate and excluded from won-cycle time.",
    "Cycle time does not feed enforce or retire labels.",
  ]
  return parts.join(" ")
}

export function analyze(
  input: AnalysisInput,
  filters: AnalysisFilters = {},
  thresholdInput?: Partial<Thresholds>
): AnalysisResult {
  const thresholds = parseThresholds(thresholdInput)
  const { runs, oppById } = applyFilters(input, filters)
  const latest = latestRunPerOpportunityPlay(runs)

  type Bucket = {
    playId: string
    playName: string
    typicalStage: string
    prerequisiteId: string
    text: string
    intent: PrerequisiteFinding["intent"]
    runIds: string[]
    nMet: number
    nUnmet: number
    winMet: { n: number; s: number }
    winUnmet: { n: number; s: number }
    advMet: { n: number; s: number }
    advUnmet: { n: number; s: number }
    cycleMet: number[]
    cycleUnmet: number[]
  }

  const buckets = new Map<string, Bucket>()

  function bucketFor(run: AnalysisRun, check: AnalysisRun["checks"][number]) {
    const key = `${run.playId}::${check.prerequisiteId}`
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = {
        playId: run.playId,
        playName: run.playName,
        typicalStage: run.typicalStage,
        prerequisiteId: check.prerequisiteId,
        text: check.text,
        intent: check.intent,
        runIds: [],
        nMet: 0,
        nUnmet: 0,
        winMet: { n: 0, s: 0 },
        winUnmet: { n: 0, s: 0 },
        advMet: { n: 0, s: 0 },
        advUnmet: { n: 0, s: 0 },
        cycleMet: [],
        cycleUnmet: [],
      }
      buckets.set(key, bucket)
    }
    if (check.text.length >= bucket.text.length) bucket.text = check.text
    return bucket
  }

  for (const run of runs) {
    for (const check of run.checks) {
      const bucket = bucketFor(run, check)
      bucket.runIds.push(run.id)
      if (check.met) bucket.nMet += 1
      else bucket.nUnmet += 1
    }
  }

  for (const run of latest) {
    const opp = oppById.get(run.opportunityId)
    if (!opp) continue
    for (const check of run.checks) {
      const bucket = bucketFor(run, check)
      if (opp.status === "won" || opp.status === "lost") {
        const win = check.met ? bucket.winMet : bucket.winUnmet
        win.n += 1
        if (opp.status === "won") win.s += 1
      }
      if (opp.advanced !== null) {
        const adv = check.met ? bucket.advMet : bucket.advUnmet
        adv.n += 1
        if (opp.advanced) adv.s += 1
      }
      if (opp.status === "won") {
        const days = daysBetween(run.runAtMs, opp.closeDateMs)
        if (days !== null && days >= 0) {
          if (check.met) bucket.cycleMet.push(days)
          else bucket.cycleUnmet.push(days)
        }
      }
    }
  }

  const findings: PrerequisiteFinding[] = [...buckets.values()].map((bucket) => {
    const nRuns = bucket.nMet + bucket.nUnmet
    const exception = buildRate(bucket.nMet, bucket.nUnmet, bucket.nUnmet, 0, thresholds)
    exception.successesMet = bucket.nUnmet
    exception.successesUnmet = 0
    exception.rateMet = nRuns > 0 ? bucket.nUnmet / nRuns : null
    exception.rateUnmet = null
    exception.diff = exception.rateMet
    exception.ciLo = null
    exception.ciHi = null
    exception.strength = nRuns >= thresholds.minArmSupported ? "supported" : nRuns >= thresholds.minArmInsufficient ? "directional" : "insufficient"

    const win = buildRate(bucket.winMet.n, bucket.winUnmet.n, bucket.winMet.s, bucket.winUnmet.s, thresholds)
    const advancement = buildRate(bucket.advMet.n, bucket.advUnmet.n, bucket.advMet.s, bucket.advUnmet.s, thresholds)
    const cycleCi = bootstrapMedianDiff(bucket.cycleMet, bucket.cycleUnmet, hashSeed(bucket.prerequisiteId), 800)
    const wonCycle: CycleComparison = {
      nMet: bucket.cycleMet.length,
      nUnmet: bucket.cycleUnmet.length,
      medianMet: median(bucket.cycleMet),
      medianUnmet: median(bucket.cycleUnmet),
      diff: cycleCi.diff,
      ciLo: cycleCi.lo,
      ciHi: cycleCi.hi,
      strength: classifyCycleStrength(
        bucket.cycleMet.length,
        bucket.cycleUnmet.length,
        cycleCi.diff,
        cycleCi.lo,
        cycleCi.hi,
        thresholds
      ),
    }

    const rec = recommend(bucket.intent, nRuns ? bucket.nUnmet / nRuns : 0, win, advancement, thresholds)
    const draft = {
      id: `${bucket.playId}:${bucket.prerequisiteId}`,
      playId: bucket.playId,
      playName: bucket.playName,
      typicalStage: bucket.typicalStage,
      prerequisiteId: bucket.prerequisiteId,
      prerequisite: bucket.text,
      intent: bucket.intent,
      skipRate: nRuns ? bucket.nUnmet / nRuns : 0,
      nRuns,
      nMet: bucket.nMet,
      nUnmet: bucket.nUnmet,
      exception,
      win,
      advancement,
      wonCycle,
      recommendation: rec.label,
      evidence: stronger(win.strength, advancement.strength),
      why: rec.why,
      summary: "",
      limitation: "",
      recordIds: [...new Set(bucket.runIds)],
    } satisfies PrerequisiteFinding
    draft.summary = summarizeFinding(draft)
    draft.limitation = limitationFor(draft)
    return draft
  })

  findings.sort((a, b) => recommendationRank(a.recommendation) - recommendationRank(b.recommendation) || b.nRuns - a.nRuns)

  return {
    findings,
    metrics: findings,
    secondary: buildSecondary(runs, oppById),
    filters,
    thresholds,
  }
}

function stronger(a: PrerequisiteFinding["evidence"], b: PrerequisiteFinding["evidence"]) {
  const order: PrerequisiteFinding["evidence"][] = ["insufficient", "directional", "no-difference", "supported"]
  return order.indexOf(a) >= order.indexOf(b) ? a : b
}

function recommendationRank(label: RecommendationLabel) {
  return { enforce: 0, reclassify: 1, investigate: 2, retire: 3, insufficient: 4 }[label]
}

function hashSeed(value: string) {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function buildSecondary(
  runs: AnalysisRun[],
  oppById: Map<string, AnalysisOpportunity>
): SecondaryReport {
  const latest = latestRunPerOpportunityPlay(runs)
  const playMap = new Map<string, PlayOutcomeRow & { advanceDays: number[]; closeDays: number[] }>()

  for (const run of runs) {
    let row = playMap.get(run.playId)
    if (!row) {
      row = {
        playId: run.playId,
        playName: run.playName,
        typicalStage: run.typicalStage,
        runs: 0,
        opportunities: 0,
        closed: 0,
        open: 0,
        exceptionRate: 0,
        winRate: null,
        nWin: 0,
        advancementRate: null,
        nAdvancement: 0,
        medianDaysToAdvance: null,
        nAdvanceDays: 0,
        medianDaysToCloseWon: null,
        nWonCycle: 0,
        note: stageNote(run.typicalStage),
        advanceDays: [],
        closeDays: [],
      }
      playMap.set(run.playId, row)
    }
    row.runs += 1
  }

  const oppPlaySeen = new Set<string>()

  for (const row of playMap.values()) {
    const playRuns = runs.filter((run) => run.playId === row.playId)
    const withException = playRuns.filter((run) => run.checks.some((check) => !check.met)).length
    row.exceptionRate = playRuns.length ? withException / playRuns.length : 0
  }

  for (const run of latest) {
    const opp = oppById.get(run.opportunityId)
    const row = playMap.get(run.playId)
    if (!opp || !row) continue
    const key = `${opp.id}::${run.playId}`
    if (oppPlaySeen.has(key)) continue
    oppPlaySeen.add(key)
    row.opportunities += 1
    if (opp.status === "open") row.open += 1
    if (opp.status === "won" || opp.status === "lost") {
      row.closed += 1
      row.nWin += 1
    }
    if (opp.advanced !== null) row.nAdvancement += 1
    if (opp.status === "won") {
      const days = daysBetween(run.runAtMs, opp.closeDateMs)
      if (days !== null && days >= 0) row.closeDays.push(days)
    }
    if (opp.advanced === true) {
      const days = daysBetween(run.runAtMs, opp.advancedOnMs)
      if (days !== null && days >= 0) row.advanceDays.push(days)
    }
  }

  for (const row of playMap.values()) {
    const latestForPlay = latest.filter((run) => run.playId === row.playId)
    let won = 0
    let advanced = 0
    for (const run of latestForPlay) {
      const opp = oppById.get(run.opportunityId)
      if (!opp) continue
      if (opp.status === "won") won += 1
      if (opp.advanced) advanced += 1
    }
    row.winRate = row.nWin > 0 ? won / row.nWin : null
    row.advancementRate = row.nAdvancement > 0 ? advanced / row.nAdvancement : null
    row.medianDaysToAdvance = median(row.advanceDays)
    row.nAdvanceDays = row.advanceDays.length
    row.medianDaysToCloseWon = median(row.closeDays)
    row.nWonCycle = row.closeDays.length
  }

  const stageOrder = ["Qualify", "Evaluate", "Validate", "Prove"]
  const plays: PlayOutcomeRow[] = [...playMap.values()].map((row) => ({
    playId: row.playId,
    playName: row.playName,
    typicalStage: row.typicalStage,
    runs: row.runs,
    opportunities: row.opportunities,
    closed: row.closed,
    open: row.open,
    exceptionRate: row.exceptionRate,
    winRate: row.winRate,
    nWin: row.nWin,
    advancementRate: row.advancementRate,
    nAdvancement: row.nAdvancement,
    medianDaysToAdvance: row.medianDaysToAdvance,
    nAdvanceDays: row.nAdvanceDays,
    medianDaysToCloseWon: row.medianDaysToCloseWon,
    nWonCycle: row.nWonCycle,
    note: row.note,
  }))
  const playsByStage = stageOrder
    .map((stage) => ({
      stage,
      rows: plays.filter((row) => row.typicalStage === stage),
    }))
    .filter((group) => group.rows.length > 0)

  const reasonMap = new Map<string, ReasonOutcomeRow & { wins: number; advanced: number; advN: number }>()
  for (const run of latest) {
    const opp = oppById.get(run.opportunityId)
    if (!opp) continue
    const reasons = run.checks.filter((check) => !check.met && check.reasonId)
    for (const check of reasons) {
      const id = check.reasonId!
      let row = reasonMap.get(id)
      if (!row) {
        row = {
          reasonId: id,
          reason: check.reasonLabel ?? id,
          n: 0,
          closed: 0,
          winRate: null,
          advancementRate: null,
          wins: 0,
          advanced: 0,
          advN: 0,
        }
        reasonMap.set(id, row)
      }
      row.n += 1
      if (opp.status === "won" || opp.status === "lost") {
        row.closed += 1
        if (opp.status === "won") row.wins += 1
      }
      if (opp.advanced !== null) {
        row.advN += 1
        if (opp.advanced) row.advanced += 1
      }
    }
  }
  const reasonOutcomes: ReasonOutcomeRow[] = [...reasonMap.values()]
    .map((row) => ({
      reasonId: row.reasonId,
      reason: row.reason,
      n: row.n,
      closed: row.closed,
      winRate: row.closed > 0 ? row.wins / row.closed : null,
      advancementRate: row.advN > 0 ? row.advanced / row.advN : null,
    }))
    .sort((a, b) => b.n - a.n)

  const stacks: Record<StackedExceptionRow["stack"], StackedExceptionRow & { wins: number; advanced: number }> = {
    none: { stack: "none", label: "No exceptions", n: 0, closed: 0, winRate: null, nWin: 0, advancementRate: null, nAdvancement: 0, wins: 0, advanced: 0 },
    one: { stack: "one", label: "One exception", n: 0, closed: 0, winRate: null, nWin: 0, advancementRate: null, nAdvancement: 0, wins: 0, advanced: 0 },
    multiple: { stack: "multiple", label: "Two or more", n: 0, closed: 0, winRate: null, nWin: 0, advancementRate: null, nAdvancement: 0, wins: 0, advanced: 0 },
  }
  for (const run of latest) {
    const opp = oppById.get(run.opportunityId)
    if (!opp) continue
    const unmet = run.checks.filter((check) => !check.met).length
    const key = unmet === 0 ? "none" : unmet === 1 ? "one" : "multiple"
    const row = stacks[key]
    row.n += 1
    if (opp.status === "won" || opp.status === "lost") {
      row.closed += 1
      row.nWin += 1
      if (opp.status === "won") row.wins += 1
    }
    if (opp.advanced !== null) {
      row.nAdvancement += 1
      if (opp.advanced) row.advanced += 1
    }
  }
  const stackedExceptions: StackedExceptionRow[] = (["none", "one", "multiple"] as const).map((key) => {
    const row = stacks[key]
    return {
      stack: row.stack,
      label: row.label,
      n: row.n,
      closed: row.closed,
      winRate: row.nWin > 0 ? row.wins / row.nWin : null,
      nWin: row.nWin,
      advancementRate: row.nAdvancement > 0 ? row.advanced / row.nAdvancement : null,
      nAdvancement: row.nAdvancement,
    }
  })

  const intent: Record<IntentExceptionRow["intent"], IntentExceptionRow & { wins: number }> = {
    required: { intent: "required", checks: 0, unmet: 0, skipRate: 0, closedUnmet: 0, winRateWhenUnmet: null, wins: 0 },
    recommended: { intent: "recommended", checks: 0, unmet: 0, skipRate: 0, closedUnmet: 0, winRateWhenUnmet: null, wins: 0 },
  }
  for (const run of latest) {
    const opp = oppById.get(run.opportunityId)
    for (const check of run.checks) {
      const row = intent[check.intent]
      row.checks += 1
      if (!check.met) {
        row.unmet += 1
        if (opp && (opp.status === "won" || opp.status === "lost")) {
          row.closedUnmet += 1
          if (opp.status === "won") row.wins += 1
        }
      }
    }
  }
  const intentExceptions: IntentExceptionRow[] = (["required", "recommended"] as const).map((key) => {
    const row = intent[key]
    return {
      intent: row.intent,
      checks: row.checks,
      unmet: row.unmet,
      skipRate: row.checks > 0 ? row.unmet / row.checks : 0,
      closedUnmet: row.closedUnmet,
      winRateWhenUnmet: row.closedUnmet > 0 ? row.wins / row.closedUnmet : null,
    }
  })

  const trendMap = new Map<string, TrendRow & { exceptions: number; wins: number }>()
  for (const run of runs) {
    const date = new Date(run.runAtMs)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    let row = trendMap.get(key)
    if (!row) {
      row = {
        month: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        monthMs: Date.UTC(date.getFullYear(), date.getMonth(), 1),
        runs: 0,
        exceptionRate: 0,
        closed: 0,
        winRate: null,
        exceptions: 0,
        wins: 0,
      }
      trendMap.set(key, row)
    }
    row.runs += 1
    if (run.checks.some((check) => !check.met)) row.exceptions += 1
  }
  for (const run of latest) {
    const opp = oppById.get(run.opportunityId)
    if (!opp) continue
    const date = new Date(run.runAtMs)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    const row = trendMap.get(key)
    if (!row) continue
    if (opp.status === "won" || opp.status === "lost") {
      row.closed += 1
      if (opp.status === "won") row.wins += 1
    }
  }
  const trends: TrendRow[] = [...trendMap.values()]
    .sort((a, b) => a.monthMs - b.monthMs)
    .map((row) => ({
      month: row.month,
      monthMs: row.monthMs,
      runs: row.runs,
      exceptionRate: row.runs > 0 ? row.exceptions / row.runs : 0,
      closed: row.closed,
      winRate: row.closed > 0 ? row.wins / row.closed : null,
    }))

  return {
    playsByStage,
    reasonOutcomes,
    stackedExceptions,
    intentExceptions,
    trends,
    stageCaveat: STAGE_CAVEAT,
  }
}

function stageNote(stage: string) {
  if (stage === "Prove") {
    return "Late-stage by design. Higher win rate and shorter remaining cycle time are expected, not a play ranking."
  }
  if (stage === "Qualify") {
    return "Earlier-stage baseline. Not comparable to Prove-stage plays."
  }
  return "Within-stage description only. Do not rank against plays from another stage."
}

export function evidenceForFinding(
  finding: PrerequisiteFinding,
  input: AnalysisInput
): FindingEvidenceRow[] {
  const oppById = new Map(input.opportunities.map((item) => [item.id, item]))
  const runById = new Map(input.runs.map((item) => [item.id, item]))
  const rows: FindingEvidenceRow[] = []

  for (const runId of finding.recordIds) {
    const run = runById.get(runId)
    if (!run) continue
    const opp = oppById.get(run.opportunityId)
    const check = run.checks.find((item) => item.prerequisiteId === finding.prerequisiteId)
    rows.push({
      runId: run.id,
      opportunityId: run.opportunityId,
      opportunityName: opp?.name ?? run.opportunityId,
      account: opp?.account ?? "",
      status: opp?.status ?? "open",
      met: check?.met ?? true,
      reasonLabel: check?.reasonLabel ?? null,
      runAtMs: run.runAtMs,
    })
  }

  return rows.sort(
    (a, b) => Number(a.met) - Number(b.met) || b.runAtMs - a.runAtMs || a.opportunityName.localeCompare(b.opportunityName)
  )
}

export function toAnalysisInput(data: {
  opportunities: Array<{
    id: string
    name: string
    account: string
    segment: string
    se: string
    stage: string
    status: AnalysisOpportunity["status"]
    createdAtMs: number
    advanced: boolean | null
    advancedOnMs: number | null
    closeDateMs: number | null
  }>
  runs: Array<{
    id: string
    opportunityId: string
    playId: string
    playName: string
    typicalStage: string
    runAtMs: number
    checks: Array<{
      prerequisiteId: string
      text: string
      intent: AnalysisRun["checks"][number]["intent"]
      met: boolean
      exceptionReasonId: string | null
      exceptionReasonLabel: string | null
    }>
  }>
}): AnalysisInput {
  return {
    opportunities: data.opportunities.map((item) => ({
      id: item.id,
      name: item.name,
      account: item.account,
      segment: item.segment,
      se: item.se,
      stage: item.stage,
      status: item.status,
      createdAtMs: item.createdAtMs,
      advanced: item.advanced,
      advancedOnMs: item.advancedOnMs,
      closeDateMs: item.closeDateMs,
    })),
    runs: data.runs.map((run) => ({
      id: run.id,
      opportunityId: run.opportunityId,
      playId: run.playId,
      playName: run.playName,
      typicalStage: run.typicalStage,
      runAtMs: run.runAtMs,
      checks: run.checks.map((check) => ({
        prerequisiteId: check.prerequisiteId,
        text: check.text,
        intent: check.intent,
        met: check.met,
        reasonId: check.exceptionReasonId,
        reasonLabel: check.exceptionReasonLabel,
      })),
    })),
  }
}
