import { ResultsView } from "@/components/results-view"
import { toAnalysisInput } from "@/analysis/engine"
import { getDb } from "@/lib/db"
import { loadAnalysisRecords } from "@/lib/ops/repo"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function ResultsPage() {
  const db = await getDb()
  const records = await loadAnalysisRecords(db)
  const input = toAnalysisInput({
    opportunities: records.opportunities,
    runs: records.runs,
  })
  return <ResultsView input={input} />
}
