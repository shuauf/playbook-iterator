import { describe, expect, it } from "vitest"

import { analyze, evidenceForFinding } from "@/analysis/engine"
import { buildPlantedCorpus, findingByPrereq } from "@/analysis/planted"
import { DEFAULT_THRESHOLDS } from "@/analysis/thresholds"

describe("analysis engine", () => {
  const corpus = buildPlantedCorpus()
  const result = analyze(corpus)

  it("finds a supported win-rate difference and labels it Enforce More Strictly", () => {
    const finding = findingByPrereq(result, "product-demo", "pd-business-problem")
    expect(finding).toBeTruthy()
    expect(finding?.win.nMet).toBe(62)
    expect(finding?.win.nUnmet).toBe(30)
    expect(finding?.win.rateMet).toBeCloseTo(40 / 62, 5)
    expect(finding?.win.rateUnmet).toBeCloseTo(6 / 30, 5)
    expect(finding?.win.strength).toBe("supported")
    expect(finding?.recommendation).toBe("enforce")
  })

  it("labels the neutral prerequisite Consider Retiring only with enough evidence", () => {
    const finding = findingByPrereq(result, "product-demo", "pd-champion")
    expect(finding).toBeTruthy()
    expect(finding?.win.nMet).toBe(64)
    expect(finding?.win.nUnmet).toBe(28)
    expect(finding?.win.rateMet).toBeCloseTo(32 / 64, 5)
    expect(finding?.win.rateUnmet).toBeCloseTo(14 / 28, 5)
    expect(finding?.skipRate).toBeGreaterThanOrEqual(0.3)
    expect(finding?.win.strength).toBe("no-difference")
    expect(finding?.advancement.strength).toBe("no-difference")
    expect(finding?.recommendation).toBe("retire")

    const strict = analyze(corpus, {}, { ...DEFAULT_THRESHOLDS, minArmSupported: 80 })
    const again = findingByPrereq(strict, "product-demo", "pd-champion")
    expect(again?.recommendation).not.toBe("retire")
  })

  it("sends the eight-observation pattern to Investigate", () => {
    const finding = findingByPrereq(result, "custom-demo", "cd-env")
    if (!finding) throw new Error("missing custom-demo finding")
    expect(finding.win.nMet + finding.win.nUnmet).toBe(8)
    expect(finding.win.rateMet).toBe(1)
    expect(finding.win.rateUnmet).toBe(0)
    expect(finding.recommendation).toBe("investigate")
    expect(finding.win.strength).toBe("directional")
  })

  it("does not treat later-stage plays as better or faster", () => {
    const discovery = result.secondary.playsByStage.find((group) => group.stage === "Qualify")
    const prove = result.secondary.playsByStage.find((group) => group.stage === "Prove")
    const disc = discovery?.rows.find((row) => row.playId === "discovery")
    const poc = prove?.rows.find((row) => row.playId === "proof-of-concept")
    expect(disc?.winRate).toBeCloseTo(0.4, 5)
    expect(poc?.winRate).toBeCloseTo(0.8, 5)
    expect(poc?.medianDaysToCloseWon).not.toBeNull()
    expect(disc?.medianDaysToCloseWon).not.toBeNull()
    expect(poc!.medianDaysToCloseWon!).toBeLessThan(disc!.medianDaysToCloseWon!)
    expect(poc?.note).toMatch(/expected, not a play ranking/i)
    expect(result.secondary.stageCaveat).toMatch(/when they happen/i)
    expect(result.findings.every((item) => item.playId !== "all")).toBe(true)
    const crossPlay = result.findings.filter((item) => item.playName.includes("more successful"))
    expect(crossPlay).toHaveLength(0)
  })

  it("excludes open opportunities from win rate and lost from won-cycle", () => {
    const finding = findingByPrereq(result, "product-demo", "pd-business-problem")
    if (!finding) throw new Error("missing business-problem finding")
    expect(finding.nRuns).toBe(104)
    expect(finding.win.nMet + finding.win.nUnmet).toBe(92)
    expect(finding.wonCycle.nMet + finding.wonCycle.nUnmet).toBe(46)
  })

  it("recomputes win rate when an open opportunity closes won", () => {
    const mutated: typeof corpus = {
      opportunities: corpus.opportunities.map((item) =>
        item.id === "pd-open-1"
          ? { ...item, status: "won" as const, closeDateMs: item.createdAtMs + 40 * 86400000 }
          : item
      ),
      runs: corpus.runs,
    }
    const before = findingByPrereq(result, "product-demo", "pd-business-problem")
    const after = findingByPrereq(analyze(mutated), "product-demo", "pd-business-problem")
    if (!before || !after) throw new Error("missing findings")
    expect(after.win.nMet + after.win.nUnmet).toBe(before.win.nMet + before.win.nUnmet + 1)
  })

  it("changes sample size and metric when filtered to one play", () => {
    const filtered = analyze(corpus, { playId: "custom-demo" })
    expect(filtered.findings.every((item) => item.playId === "custom-demo")).toBe(true)
    expect(filtered.findings).toHaveLength(1)
    expect(filtered.metrics[0]?.nRuns).toBe(8)
  })

  it("reclassifies a recommended prerequisite with supported harm", () => {
    const finding = findingByPrereq(result, "architecture-deep-dive", "ad-risks")
    expect(finding?.intent).toBe("recommended")
    expect(finding?.win.nMet).toBe(25)
    expect(finding?.win.nUnmet).toBe(20)
    expect(finding?.recommendation).toBe("reclassify")
  })

  it("lists inspectable records for a finding, unmet first", () => {
    const finding = findingByPrereq(result, "product-demo", "pd-business-problem")
    if (!finding) throw new Error("missing business-problem finding")
    const rows = evidenceForFinding(finding, corpus)
    expect(rows.length).toBe(finding.recordIds.length)
    expect(rows.filter((row) => !row.met)).toHaveLength(finding.nUnmet)
    expect(rows.filter((row) => row.met)).toHaveLength(finding.nMet)
    expect(rows[0]?.met).toBe(false)
    expect(rows[0]?.reasonLabel).toBeTruthy()
    expect(rows[0]?.opportunityName).toBeTruthy()
  })

  it("updates recommendation cards when thresholds change", () => {
    const loose = analyze(corpus, {}, { ...DEFAULT_THRESHOLDS, minArmSupported: 4, minArmInsufficient: 2 })
    const custom = findingByPrereq(loose, "custom-demo", "cd-env")
    expect(custom?.recommendation).toBe("enforce")

    const tight = analyze(corpus, {}, { ...DEFAULT_THRESHOLDS, minSkipForRetire: 0.9 })
    const champion = findingByPrereq(tight, "product-demo", "pd-champion")
    expect(champion?.recommendation).not.toBe("retire")
  })
})
