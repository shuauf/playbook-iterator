import type { Thresholds } from "@/analysis/types"

export const DEFAULT_THRESHOLDS: Thresholds = {
  minArmInsufficient: 8,
  minArmSupported: 20,
  materialPp: 0.1,
  equivalencePp: 0.05,
  minSkipForRetire: 0.3,
}

export function parseThresholds(input?: Partial<Thresholds> | null): Thresholds {
  return {
    minArmInsufficient: input?.minArmInsufficient ?? DEFAULT_THRESHOLDS.minArmInsufficient,
    minArmSupported: input?.minArmSupported ?? DEFAULT_THRESHOLDS.minArmSupported,
    materialPp: input?.materialPp ?? DEFAULT_THRESHOLDS.materialPp,
    equivalencePp: input?.equivalencePp ?? DEFAULT_THRESHOLDS.equivalencePp,
    minSkipForRetire: input?.minSkipForRetire ?? DEFAULT_THRESHOLDS.minSkipForRetire,
  }
}
