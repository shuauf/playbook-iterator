import { buildPlantedCorpus } from "@/analysis/planted"
import { formatIsoDate } from "@/lib/dates"
import { toCsv } from "@/lib/import/parse"

function bool(value: boolean | null) {
  if (value === null) return ""
  return value ? "true" : "false"
}

export function syntheticCsvBundle() {
  const corpus = buildPlantedCorpus()
  const opportunities = toCsv(
    [
      "external_id",
      "name",
      "account",
      "segment",
      "se",
      "stage",
      "status",
      "created_at",
      "advanced",
      "advanced_on",
      "close_date",
    ],
    corpus.opportunities.map((item) => ({
      external_id: item.id,
      name: item.name,
      account: item.account,
      segment: item.segment,
      se: item.se,
      stage: item.stage,
      status: item.status,
      created_at: formatIsoDate(new Date(item.createdAtMs)),
      advanced: bool(item.advanced),
      advanced_on: item.advancedOnMs ? formatIsoDate(new Date(item.advancedOnMs)) : "",
      close_date: item.closeDateMs ? formatIsoDate(new Date(item.closeDateMs)) : "",
    }))
  )

  const playRuns = toCsv(
    ["external_id", "opportunity_external_id", "play_id", "stage_at_run", "run_at"],
    corpus.runs.map((item) => ({
      external_id: item.id,
      opportunity_external_id: item.opportunityId,
      play_id: item.playId,
      stage_at_run: item.typicalStage,
      run_at: formatIsoDate(new Date(item.runAtMs)),
    }))
  )

  const checks = toCsv(
    ["play_run_external_id", "prerequisite_id", "met", "exception_reason_id", "note", "approver"],
    corpus.runs.flatMap((run) =>
      run.checks.map((check) => ({
        play_run_external_id: run.id,
        prerequisite_id: check.prerequisiteId,
        met: check.met ? "true" : "false",
        exception_reason_id: check.reasonId ?? "",
        note: "",
        approver: "",
      }))
    )
  )

  return { opportunities, playRuns, checks }
}
