import { LogView } from "@/components/log-view"
import { getDb } from "@/lib/db"
import { listOutcomeQueue, listOpportunities, listPlayRuns } from "@/lib/ops/repo"
import { listPlays, listReasons } from "@/lib/playbook/repo"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function LogPage() {
  const db = await getDb()
  const [plays, reasons, opportunities, runs, queue] = await Promise.all([
    listPlays(db),
    listReasons(db),
    listOpportunities(db),
    listPlayRuns(db),
    listOutcomeQueue(db),
  ])
  return (
    <LogView
      plays={plays}
      reasons={reasons}
      opportunities={opportunities}
      runs={runs}
      queue={queue}
    />
  )
}
