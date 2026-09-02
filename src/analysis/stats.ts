import type { EvidenceStrength, Thresholds } from "@/analysis/types"

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!
}

export function wilsonCI(successes: number, n: number, z = 1.96) {
  if (n <= 0) return { lo: 0, hi: 1 }
  const p = successes / n
  const z2 = z * z
  const denom = 1 + z2 / n
  const center = (p + z2 / (2 * n)) / denom
  const margin = (z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / denom
  return {
    lo: Math.max(0, center - margin),
    hi: Math.min(1, center + margin),
  }
}

export function rateDiffCI(
  successesMet: number,
  nMet: number,
  successesUnmet: number,
  nUnmet: number
) {
  if (nMet <= 0 || nUnmet <= 0) {
    return { diff: null, lo: null, hi: null }
  }
  const pMet = successesMet / nMet
  const pUnmet = successesUnmet / nUnmet
  const diff = pMet - pUnmet
  const met = wilsonCI(successesMet, nMet)
  const unmet = wilsonCI(successesUnmet, nUnmet)
  const lo = diff - Math.sqrt((pMet - met.lo) ** 2 + (unmet.hi - pUnmet) ** 2)
  const hi = diff + Math.sqrt((met.hi - pMet) ** 2 + (pUnmet - unmet.lo) ** 2)
  return { diff, lo, hi }
}

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return function next() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function resample(values: number[], rng: () => number) {
  if (values.length === 0) return []
  const out = new Array<number>(values.length)
  for (let i = 0; i < values.length; i++) {
    out[i] = values[Math.floor(rng() * values.length)]!
  }
  return out
}

export function bootstrapMedianDiff(
  met: number[],
  unmet: number[],
  seed = 1,
  iterations = 2000
) {
  const observedMet = median(met)
  const observedUnmet = median(unmet)
  if (observedMet === null || observedUnmet === null) {
    return { diff: null, lo: null, hi: null }
  }
  const diff = observedMet - observedUnmet
  if (met.length === 0 || unmet.length === 0) {
    return { diff, lo: null, hi: null }
  }
  const rng = mulberry32(seed)
  const samples: number[] = []
  for (let i = 0; i < iterations; i++) {
    const metSample = median(resample(met, rng))
    const unmetSample = median(resample(unmet, rng))
    if (metSample === null || unmetSample === null) continue
    samples.push(metSample - unmetSample)
  }
  samples.sort((a, b) => a - b)
  const lo = samples[Math.floor(0.025 * samples.length)] ?? null
  const hi = samples[Math.min(samples.length - 1, Math.floor(0.975 * samples.length))] ?? null
  return { diff, lo, hi }
}

export function classifyRateStrength(
  nMet: number,
  nUnmet: number,
  diff: number | null,
  lo: number | null,
  hi: number | null,
  thresholds: Thresholds
): EvidenceStrength {
  const minArm = Math.min(nMet, nUnmet)
  const total = nMet + nUnmet
  if (diff === null || lo === null || hi === null) return "insufficient"
  const excludesZero = lo > 0 || hi < 0

  if (minArm < thresholds.minArmInsufficient) {
    if (total >= thresholds.minArmInsufficient && Math.abs(diff) >= thresholds.materialPp) {
      return "directional"
    }
    return "insufficient"
  }
  if (excludesZero) {
    return minArm >= thresholds.minArmSupported ? "supported" : "directional"
  }
  if (minArm >= thresholds.minArmSupported && Math.abs(diff) <= thresholds.equivalencePp) {
    return "no-difference"
  }
  return "directional"
}

export function classifyCycleStrength(
  nMet: number,
  nUnmet: number,
  diff: number | null,
  lo: number | null,
  hi: number | null,
  thresholds: Thresholds
): EvidenceStrength {
  const minArm = Math.min(nMet, nUnmet)
  if (diff === null || lo === null || hi === null || minArm < thresholds.minArmInsufficient) {
    return "insufficient"
  }
  const excludesZero = lo > 0 || hi < 0
  if (excludesZero) {
    return minArm >= thresholds.minArmSupported ? "supported" : "directional"
  }
  if (minArm >= thresholds.minArmSupported && Math.abs(diff) <= 7 && lo >= -14 && hi <= 14) {
    return "no-difference"
  }
  return "directional"
}

export function rateLimitation(strength: EvidenceStrength, metric: string) {
  switch (strength) {
    case "insufficient":
      return `Not enough ${metric} observations in both comparison groups to treat the gap as evidence.`
    case "directional":
      return `The ${metric} gap is large enough to notice, but at least one arm is still small or the interval still includes no difference. Directional only.`
    case "supported":
      return `The ${metric} difference is large enough, and both arms meet the sample floor. This is still observational — not proof that the prerequisite causes the outcome.`
    case "no-difference":
      return `Both ${metric} arms meet the sample floor and the observed difference sits inside the equivalence window. The interval can still be wide; this is not proof of zero effect in every future cohort.`
  }
}
