import { playRuns } from "@/lib/db/schema"
import { seedIfEmpty } from "@/lib/db/seed"
import type { PlaybookDb } from "@/lib/db/types"
import { loadSyntheticDataset } from "@/lib/import/load-synthetic"
import { ensureCanonicalPlays } from "@/lib/playbook/catalog-sync"

export async function bootstrapPlaybook(db: PlaybookDb) {
  await seedIfEmpty(db)
  const existing = await db.select({ id: playRuns.id }).from(playRuns).limit(1)
  if (existing.length > 0) {
    return { demoLoaded: false }
  }
  await ensureCanonicalPlays(db)
  await loadSyntheticDataset(db)
  return { demoLoaded: true }
}
