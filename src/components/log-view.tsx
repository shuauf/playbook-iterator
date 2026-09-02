"use client"

import { useMemo, useState, useTransition } from "react"
import {
  AlertCircle,
  CheckCircle2,
  Inbox,
  Plus,
  Upload,
} from "lucide-react"

import { IntentBadge } from "@/components/finding-badge"
import { PageIntro } from "@/components/page-intro"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatDays } from "@/lib/format"
import {
  commitImportAction,
  createOpportunityAction,
  loadSyntheticDatasetAction,
  previewImportAction,
  previewTinyOpportunitiesAction,
  recordPlayRunAction,
  updateOpportunityOutcomeAction,
} from "@/lib/ops/actions"
import type { OpportunityDto, OutcomeQueueItemDto, PlayRunDto } from "@/lib/ops/types"
import type { ImportKind, ImportPreview } from "@/lib/import/csv"
import { SEGMENTS, TYPICAL_STAGES, type ExceptionReasonDto, type PlayDto } from "@/lib/playbook/types"
import { cn } from "@/lib/utils"

type CheckState = {
  met: boolean
  reason: string
  note: string
  approver: string
}

export function LogView({
  plays,
  reasons,
  opportunities,
  runs,
  queue,
}: {
  plays: PlayDto[]
  reasons: ExceptionReasonDto[]
  opportunities: OpportunityDto[]
  runs: PlayRunDto[]
  queue: OutcomeQueueItemDto[]
}) {
  const activePlays = plays.filter((play) => play.status === "active")
  const [section, setSection] = useState("record")
  const [query, setQuery] = useState("")
  const [opportunityId, setOpportunityId] = useState(opportunities[0]?.id ?? "")
  const [playId, setPlayId] = useState(activePlays[0]?.id ?? "")
  const [checks, setChecks] = useState<Record<string, CheckState>>({})
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [draftOpp, setDraftOpp] = useState({
    name: "",
    account: "",
    segment: "Mid-market",
    se: "",
    stage: "Evaluate",
  })
  const [outcomeDates, setOutcomeDates] = useState<Record<string, string>>({})
  const [importKind, setImportKind] = useState<ImportKind>("opportunities")
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [importCsv, setImportCsv] = useState<string>("")
  const [pending, startTransition] = useTransition()

  const opportunity = opportunities.find((item) => item.id === opportunityId)
  const play = activePlays.find((item) => item.id === playId) ?? activePlays[0]
  const currentPrereqs =
    play?.prerequisites.filter((item) => item.status === "active") ?? []
  const activeReasons = reasons.filter((item) => item.status === "active")
  const selectedRun = runs.find((item) => item.id === selectedRunId)

  const filteredOpps = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return opportunities.filter((item) =>
      `${item.name} ${item.account} ${item.se} ${item.segment} ${item.status}`
        .toLowerCase()
        .includes(needle)
    )
  }, [query, opportunities])

  function getCheck(id: string): CheckState {
    return checks[id] ?? { met: true, reason: "", note: "", approver: "" }
  }

  function updateCheck(id: string, patch: Partial<CheckState>) {
    setChecks((current) => {
      const previous = current[id] ?? {
        met: true,
        reason: "",
        note: "",
        approver: "",
      }
      return { ...current, [id]: { ...previous, ...patch } }
    })
  }

  function recordRun() {
    if (!play || !opportunityId) return
    const unmet = currentPrereqs.filter((item) => !getCheck(item.id).met)
    const missingReason = unmet.find((item) => !getCheck(item.id).reason)
    if (missingReason) {
      setError(
        `“${missingReason.text}” is unmet. Choose an exception reason before recording the run.`
      )
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await recordPlayRunAction({
        opportunityId,
        playId: play.id,
        checks: currentPrereqs.map((item) => {
          const state = getCheck(item.id)
          return {
            prerequisiteId: item.id,
            met: state.met,
            exceptionReasonId: state.met ? undefined : state.reason,
            note: state.note,
            approver: state.approver,
          }
        }),
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setChecks({})
      setMessage("Play run saved. It will stay attached to this playbook version.")
    })
  }

  function createOpp() {
    startTransition(async () => {
      const result = await createOpportunityAction(draftOpp)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setCreating(false)
      setDraftOpp({
        name: "",
        account: "",
        segment: "Mid-market",
        se: "",
        stage: "Evaluate",
      })
      setOpportunityId(result.id)
      setMessage("Opportunity created.")
    })
  }

  const unresolved = queue.length

  return (
    <div>
      <PageIntro kicker="Log" title="Record the play you actually ran">
        Select an opportunity, choose the play, and say whether each current
        prerequisite was met. Unmet items are not failures — they are explicit
        exceptions that later connect to outcomes.
      </PageIntro>

      <div className="mb-5 flex w-full max-w-xl gap-1 rounded-lg bg-muted p-0.5 text-sm">
        {(
          [
            { id: "record", label: "Record a play" },
            { id: "outcomes", label: "Outcomes queue" },
            { id: "import", label: "Import" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5",
              section === item.id && "bg-card text-foreground shadow-sm"
            )}
          >
            {item.label}
            {item.id === "outcomes" ? (
              <Badge variant="secondary">{unresolved}</Badge>
            ) : null}
          </button>
        ))}
      </div>

      {message ? (
        <p className="mb-4 text-sm text-[oklch(0.38_0.07_155)]">{message}</p>
      ) : null}

      {section === "record" ? (
        <div className="space-y-6">
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
            <div className="space-y-4">
              <Card>
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>Opportunity</CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCreating((value) => !value)}
                    >
                      <Plus className="size-3.5" />
                      New
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {creating ? (
                    <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
                      <Input
                        value={draftOpp.name}
                        onChange={(event) =>
                          setDraftOpp((current) => ({ ...current, name: event.target.value }))
                        }
                        placeholder="Opportunity name"
                      />
                      <Input
                        value={draftOpp.account}
                        onChange={(event) =>
                          setDraftOpp((current) => ({ ...current, account: event.target.value }))
                        }
                        placeholder="Account"
                      />
                      <Input
                        value={draftOpp.se}
                        onChange={(event) =>
                          setDraftOpp((current) => ({ ...current, se: event.target.value }))
                        }
                        placeholder="SE name"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          value={draftOpp.segment}
                          onValueChange={(value) =>
                            setDraftOpp((current) => ({ ...current, segment: String(value) }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SEGMENTS.map((segment) => (
                              <SelectItem key={segment} value={segment}>
                                {segment}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={draftOpp.stage}
                          onValueChange={(value) =>
                            setDraftOpp((current) => ({ ...current, stage: String(value) }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TYPICAL_STAGES.map((stage) => (
                              <SelectItem key={stage} value={stage}>
                                {stage}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button size="sm" onClick={createOpp} disabled={pending}>
                        Create opportunity
                      </Button>
                    </div>
                  ) : null}
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search account, SE, or segment"
                  />
                  <ul className="max-h-[320px] space-y-1 overflow-auto">
                    {filteredOpps.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setOpportunityId(item.id)}
                          className={cn(
                            "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                            opportunityId === item.id
                              ? "border-[oklch(0.75_0.05_175)] bg-[oklch(0.96_0.02_175)]"
                              : "border-transparent hover:bg-muted/70"
                          )}
                        >
                          <span className="block text-sm font-medium">{item.name}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {item.segment} · {item.stage} · {item.se} · {item.status}
                          </span>
                        </button>
                      </li>
                    ))}
                    {filteredOpps.length === 0 ? (
                      <li className="rounded-lg bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
                        No opportunities match that search. Create one to log a run.
                      </li>
                    ) : null}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b">
                  <CardTitle>Sales play</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-1.5">
                  {activePlays.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No active plays. Define one in Config first.
                    </p>
                  ) : (
                    activePlays.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setPlayId(item.id)
                          setChecks({})
                          setError(null)
                        }}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          playId === item.id
                            ? "border-[oklch(0.55_0.07_175)] bg-[oklch(0.35_0.055_175)] text-primary-foreground"
                            : "border-border bg-background text-foreground hover:bg-muted"
                        )}
                      >
                        {item.name}
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {play && opportunity ? (
              <Card>
                <CardHeader className="border-b">
                  <p className="text-xs text-muted-foreground">
                    Current playbook · {play.typicalStage} · v{play.definitionVersion} ·{" "}
                    {opportunity.name}
                  </p>
                  <CardTitle className="font-heading text-2xl">{play.name}</CardTitle>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {play.purpose}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                    We know this is outside the current playbook, and this is why
                    we are doing it — only when a box is cleared.
                  </p>
                  {currentPrereqs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      This play has no active prerequisites. Add them in Config
                      before logging a run.
                    </p>
                  ) : null}
                  {currentPrereqs.map((item) => {
                    const state = getCheck(item.id)
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "rounded-xl border p-3 transition-colors",
                          state.met
                            ? "border-border/80 bg-background/70"
                            : "border-[oklch(0.82_0.08_70)] bg-[oklch(0.98_0.02_85)]"
                        )}
                      >
                        <button
                          type="button"
                          className="flex w-full cursor-pointer items-start gap-3 text-left"
                          onClick={() => updateCheck(item.id, { met: !state.met })}
                        >
                          <Checkbox
                            checked={state.met}
                            className="pointer-events-none mt-0.5"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium">{item.text}</span>
                              <IntentBadge intent={item.intent} />
                            </span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {state.met
                                ? "Met for this run"
                                : "Unmet — an exception is required"}
                            </span>
                          </span>
                        </button>
                        {!state.met ? (
                          <div className="mt-3 space-y-3 border-t border-[oklch(0.88_0.04_70)] pt-3">
                            <div>
                              <p className="mb-1.5 text-xs font-medium">Exception reason</p>
                              <Select
                                value={state.reason || null}
                                onValueChange={(value) =>
                                  updateCheck(item.id, { reason: String(value ?? "") })
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Choose why this is unmet" />
                                </SelectTrigger>
                                <SelectContent>
                                  {activeReasons.map((reason) => (
                                    <SelectItem key={reason.id} value={reason.id}>
                                      {reason.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <p className="mb-1.5 text-xs font-medium">
                                Note{" "}
                                <span className="font-normal text-muted-foreground">(optional)</span>
                              </p>
                              <Textarea
                                rows={2}
                                value={state.note}
                                onChange={(event) =>
                                  updateCheck(item.id, { note: event.target.value })
                                }
                                placeholder="What made this the right call in the room?"
                              />
                            </div>
                            <div>
                              <p className="mb-1.5 text-xs font-medium">
                                Approver{" "}
                                <span className="font-normal text-muted-foreground">(optional)</span>
                              </p>
                              <Input
                                value={state.approver}
                                onChange={(event) =>
                                  updateCheck(item.id, { approver: event.target.value })
                                }
                                placeholder="Name of the person who accepted the exception"
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )
                  })}

                  {error ? (
                    <p className="flex items-start gap-2 text-sm text-destructive">
                      <AlertCircle className="mt-0.5 size-4 shrink-0" />
                      {error}
                    </p>
                  ) : null}

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                      Recording attaches this run to the current {play.name}{" "}
                      definition. Later Config edits will not rewrite it.
                    </p>
                    <Button onClick={recordRun} disabled={pending || currentPrereqs.length === 0}>
                      Record play run
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  Create an opportunity and keep an active sales play before logging a run.
                </CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Recently logged runs</CardTitle>
            </CardHeader>
            <CardContent>
              {runs.length === 0 ? (
                <div className="flex items-start gap-3 py-2 text-sm text-muted-foreground">
                  <Inbox className="mt-0.5 size-4 shrink-0" />
                  Nothing recorded yet. Log a Product Demo with an unmet
                  prerequisite to see the exception interaction, then submit.
                </div>
              ) : (
                <ul className="space-y-2">
                  {runs.slice(0, 12).map((run) => (
                    <li key={run.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedRunId((current) => (current === run.id ? null : run.id))
                        }
                        className="flex w-full items-start justify-between gap-3 rounded-lg border bg-background/70 px-3 py-2.5 text-left"
                      >
                        <span>
                          <span className="flex items-center gap-2 text-sm font-medium">
                            <CheckCircle2 className="size-4 text-[oklch(0.45_0.1_155)]" />
                            {run.playName} · {run.opportunityName}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {run.exceptionCount === 0
                              ? "All prerequisites met"
                              : `${run.exceptionCount} exception${run.exceptionCount === 1 ? "" : "s"} logged`}
                            {" · "}
                            {run.runAt}
                            {run.daysToAdvancement !== null
                              ? ` · advanced in ${formatDays(run.daysToAdvancement)}`
                              : ""}
                            {run.daysToClose !== null
                              ? ` · ${run.closeStatus} in ${formatDays(run.daysToClose)}`
                              : ""}
                          </span>
                        </span>
                      </button>
                      {selectedRunId === run.id && selectedRun ? (
                        <HistoricalRun run={selectedRun} />
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {section === "outcomes" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {(["advancement", "close"] as const).map((type) => {
            const items = queue.filter((item) => item.type === type)
            return (
              <Card key={type}>
                <CardHeader className="border-b">
                  <CardTitle>
                    {type === "advancement" ? "Needs advancement" : "Needs close"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {type === "advancement"
                      ? "Did the opportunity move forward after this play?"
                      : "Open opportunities still need a won / lost result and date."}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nothing waiting in this queue.
                    </p>
                  ) : null}
                  {items.map((item) => (
                    <div key={`${item.type}-${item.opportunityId}`} className="rounded-xl border bg-background/70 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{item.opportunityName}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.latestPlayName} · {item.se} · {item.latestRunAt}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {type === "advancement" ? "Run" : "Opportunity"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
                      <div className="mt-3 flex flex-col gap-2">
                        <Label className="text-xs">
                          {type === "advancement" ? "Advancement date" : "Close date"}
                        </Label>
                        <Input
                          type="date"
                          value={outcomeDates[`${item.type}-${item.opportunityId}`] ?? ""}
                          onChange={(event) =>
                            setOutcomeDates((current) => ({
                              ...current,
                              [`${item.type}-${item.opportunityId}`]: event.target.value,
                            }))
                          }
                        />
                        <div className="flex flex-wrap gap-2">
                          {type === "advancement" ? (
                            <>
                              <Button
                                size="sm"
                                disabled={pending}
                                onClick={() =>
                                  startTransition(async () => {
                                    await updateOpportunityOutcomeAction(item.opportunityId, {
                                      advanced: true,
                                      advancedOn:
                                        outcomeDates[`${item.type}-${item.opportunityId}`] ||
                                        undefined,
                                    })
                                  })
                                }
                              >
                                Advanced
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={pending}
                                onClick={() =>
                                  startTransition(async () => {
                                    await updateOpportunityOutcomeAction(item.opportunityId, {
                                      advanced: false,
                                      advancedOn:
                                        outcomeDates[`${item.type}-${item.opportunityId}`] ||
                                        undefined,
                                    })
                                  })
                                }
                              >
                                Did not advance
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                disabled={pending}
                                onClick={() =>
                                  startTransition(async () => {
                                    await updateOpportunityOutcomeAction(item.opportunityId, {
                                      status: "won",
                                      closeDate:
                                        outcomeDates[`${item.type}-${item.opportunityId}`] ||
                                        undefined,
                                    })
                                  })
                                }
                              >
                                Closed won
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={pending}
                                onClick={() =>
                                  startTransition(async () => {
                                    await updateOpportunityOutcomeAction(item.opportunityId, {
                                      status: "lost",
                                      closeDate:
                                        outcomeDates[`${item.type}-${item.opportunityId}`] ||
                                        undefined,
                                    })
                                  })
                                }
                              >
                                Closed lost
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : null}

      {section === "import" ? (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Administrative bulk import</CardTitle>
            <p className="text-sm text-muted-foreground">
              Validate everything, preview new records, updates and errors, then
              commit all rows or none. Upserts use stable external IDs.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(["opportunities", "play_runs", "prerequisite_checks"] as const).map((kind) => (
                <Button
                  key={kind}
                  size="sm"
                  variant={importKind === kind ? "default" : "outline"}
                  onClick={() => {
                    setImportKind(kind)
                    setImportPreview(null)
                  }}
                >
                  {kind.replaceAll("_", " ")}
                </Button>
              ))}
            </div>
            <label className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-10 text-center hover:bg-muted/70">
              <Upload className="size-5 text-muted-foreground" />
              <span className="text-sm font-medium">Drop a CSV here, or click to choose a file</span>
              <span className="text-xs text-muted-foreground">
                Current type: {importKind.replaceAll("_", " ")}
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  startTransition(async () => {
                    const text = await file.text()
                    setImportCsv(text)
                    const result = await previewImportAction(importKind, text)
                    if (!result.ok) {
                      setError(result.error)
                      return
                    }
                    setImportPreview(result.preview)
                    setError(null)
                  })
                }}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await previewTinyOpportunitiesAction()
                    if (!result.ok) {
                      setError(result.error)
                      return
                    }
                    setImportKind("opportunities")
                    setImportCsv(result.csv)
                    setImportPreview(result.preview)
                  })
                }
              >
                Preview tiny validation CSV
              </Button>
              <Button
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await loadSyntheticDatasetAction()
                    if (!result.ok) {
                      setError(result.error)
                      return
                    }
                    setMessage(
                      `Loaded interview dataset: ${result.opportunities} opportunities, ${result.playRuns} runs, ${result.checks} checks.`
                    )
                  })
                }
              >
                Load interview dataset
              </Button>
            </div>

            {importPreview ? (
              <div className="overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Row</th>
                      <th className="px-3 py-2 font-medium">Record</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.rows.map((row) => (
                      <tr key={`${row.row}-${row.externalId}`} className="border-t">
                        <td className="px-3 py-2">{row.row}</td>
                        <td className="px-3 py-2">{row.summary}</td>
                        <td className="px-3 py-2">
                          <span
                            className={
                              row.status === "error" || row.status === "duplicate"
                                ? "text-destructive"
                                : "text-[oklch(0.38_0.08_155)]"
                            }
                          >
                            {row.message}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex flex-col gap-2 border-t bg-muted/40 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    {importPreview.newCount} new · {importPreview.updateCount} updates ·{" "}
                    {importPreview.errorCount} errors · {importPreview.duplicateCount} duplicates.
                    {importPreview.canCommit
                      ? " Nothing is saved until you confirm."
                      : " Invalid imports are refused in full — nothing will be saved."}
                  </p>
                  <Button
                    disabled={!importPreview.canCommit || pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await commitImportAction(importKind, importCsv)
                        if (!result.ok) {
                          setError(result.error)
                          return
                        }
                        setMessage(
                          `Imported ${result.newCount} new and ${result.updateCount} updated records.`
                        )
                        setImportPreview(null)
                      })
                    }
                  >
                    Commit import
                  </Button>
                </div>
              </div>
            ) : null}
            {error && section === "import" ? (
              <p className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {error}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function HistoricalRun({ run }: { run: PlayRunDto }) {
  return (
    <div className="mt-2 space-y-2 rounded-lg bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">
        Wording stored with this run · {run.playName} v{run.definitionVersion}. Later Config
        edits do not rewrite these lines.
      </p>
      {run.checks.map((check) => (
        <div key={check.id} className="rounded-md border bg-background px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{check.text}</p>
            <IntentBadge intent={check.intent} />
            {check.prerequisiteStatus === "retired" ? (
              <Badge variant="secondary">Later retired</Badge>
            ) : null}
            {check.currentText && check.currentText !== check.text ? (
              <Badge variant="outline">Original wording</Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {check.met
              ? "Met"
              : `Unmet · ${check.exceptionReasonLabel ?? "exception"}${check.note ? ` · ${check.note}` : ""}`}
          </p>
        </div>
      ))}
    </div>
  )
}
