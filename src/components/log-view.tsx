"use client"

import { useMemo, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  Inbox,
  Upload,
} from "lucide-react"

import { IntentBadge } from "@/components/finding-badge"
import { PageIntro } from "@/components/page-intro"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  importPreviewRows,
  opportunities,
  outcomeQueue,
} from "@/data/sample"
import type { ExceptionReasonDto, PlayDto } from "@/lib/playbook/types"
import { cn } from "@/lib/utils"

type CheckState = {
  met: boolean
  reason: string
  note: string
  approver: string
}

type SessionRun = {
  id: string
  opportunity: string
  play: string
  exceptions: number
  at: string
}

export function LogView({
  plays,
  reasons,
}: {
  plays: PlayDto[]
  reasons: ExceptionReasonDto[]
}) {
  const activePlays = plays.filter((play) => play.status === "active")
  const [section, setSection] = useState("record")
  const [query, setQuery] = useState("")
  const [opportunityId, setOpportunityId] = useState(opportunities[0].id)
  const [playId, setPlayId] = useState(activePlays[0]?.id ?? "")
  const [checks, setChecks] = useState<Record<string, CheckState>>({})
  const [error, setError] = useState<string | null>(null)
  const [sessionRuns, setSessionRuns] = useState<SessionRun[]>([])
  const [resolvedQueue, setResolvedQueue] = useState<Record<string, string>>({})
  const [previewOpen, setPreviewOpen] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)

  const opportunity = opportunities.find((item) => item.id === opportunityId)
  const play = activePlays.find((item) => item.id === playId) ?? activePlays[0]
  const currentPrereqs =
    play?.prerequisites.filter((item) => item.status === "active") ?? []
  const activeReasons = reasons.filter((item) => item.status === "active")

  const filteredOpps = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return opportunities.filter((item) =>
      `${item.name} ${item.account} ${item.se} ${item.segment}`
        .toLowerCase()
        .includes(needle)
    )
  }, [query])

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
    if (!play) return
    const unmet = currentPrereqs.filter((item) => !getCheck(item.id).met)
    const missingReason = unmet.find((item) => !getCheck(item.id).reason)
    if (missingReason) {
      setError(
        `“${missingReason.text}” is unmet. Choose an exception reason before recording the run.`
      )
      return
    }
    setError(null)
    setSessionRuns((current) => [
      {
        id: `run-${Date.now()}`,
        opportunity: opportunity?.name ?? "Opportunity",
        play: play.name,
        exceptions: unmet.length,
        at: "Just now · this session only",
      },
      ...current,
    ])
    setChecks({})
  }

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
              <Badge variant="secondary">
                {outcomeQueue.filter((entry) => !resolvedQueue[entry.id]).length}
              </Badge>
            ) : null}
          </button>
        ))}
      </div>

      {section === "record" ? (
        <div className="space-y-6">
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
            <div className="space-y-4">
              <Card>
                <CardHeader className="border-b">
                  <CardTitle>Opportunity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
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
                          <span className="block text-sm font-medium">
                            {item.name}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {item.segment} · {item.stage} · {item.se}
                          </span>
                        </button>
                      </li>
                    ))}
                    {filteredOpps.length === 0 ? (
                      <li className="rounded-lg bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
                        No sample opportunities match that search.
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

            {play ? (
            <Card>
              <CardHeader className="border-b">
                <p className="text-xs text-muted-foreground">
                  Current playbook · {play.typicalStage} · v{play.definitionVersion}
                </p>
                <CardTitle className="font-heading text-2xl">
                  {play.name}
                </CardTitle>
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
                          onCheckedChange={(checked) =>
                            updateCheck(item.id, { met: checked === true })
                          }
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
                            <p className="mb-1.5 text-xs font-medium">
                              Exception reason
                            </p>
                            <Select
                              value={state.reason || null}
                              onValueChange={(value) =>
                                updateCheck(item.id, {
                                  reason: String(value ?? ""),
                                })
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
                              Note <span className="font-normal text-muted-foreground">(optional)</span>
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
                              Approver <span className="font-normal text-muted-foreground">(optional)</span>
                            </p>
                            <Input
                              value={state.approver}
                              onChange={(event) =>
                                updateCheck(item.id, {
                                  approver: event.target.value,
                                })
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
                  <Button onClick={recordRun}>Record play run</Button>
                </div>
              </CardContent>
            </Card>
            ) : (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Config has no active sales play yet, so there is nothing to log.
              </CardContent>
            </Card>
            )}
          </div>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Recorded this session</CardTitle>
            </CardHeader>
            <CardContent>
              {sessionRuns.length === 0 ? (
                <div className="flex items-start gap-3 py-2 text-sm text-muted-foreground">
                  <Inbox className="mt-0.5 size-4 shrink-0" />
                  Nothing recorded yet. Log a Product Demo with an unmet
                  prerequisite to see the exception interaction, then submit.
                </div>
              ) : (
                <ul className="space-y-2">
                  {sessionRuns.map((run) => (
                    <li
                      key={run.id}
                      className="flex items-start justify-between gap-3 rounded-lg border bg-background/70 px-3 py-2.5"
                    >
                      <span>
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <CheckCircle2 className="size-4 text-[oklch(0.45_0.1_155)]" />
                          {run.play} · {run.opportunity}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {run.exceptions === 0
                            ? "All prerequisites met"
                            : `${run.exceptions} exception${run.exceptions === 1 ? "" : "s"} logged`}
                          {" · "}
                          {run.at}
                        </span>
                      </span>
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
              const items = outcomeQueue.filter((item) => item.type === type)
              return (
                <Card key={type}>
                  <CardHeader className="border-b">
                    <CardTitle>
                      {type === "advancement"
                        ? "Needs advancement"
                        : "Needs close"}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {type === "advancement"
                        ? "Did the opportunity move forward after this play?"
                        : "Open opportunities still need a won / lost result and date."}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {items.map((item) => {
                      const resolution = resolvedQueue[item.id]
                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border bg-background/70 p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">
                                {item.opportunity}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.play} · {item.se} · {item.runDate}
                              </p>
                            </div>
                            <Badge variant="secondary">
                              {type === "advancement" ? "Run" : "Opportunity"}
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {item.detail}
                          </p>
                          {resolution ? (
                            <p className="mt-3 text-sm text-[oklch(0.38_0.07_155)]">
                              {resolution}
                            </p>
                          ) : (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {type === "advancement" ? (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      setResolvedQueue((current) => ({
                                        ...current,
                                        [item.id]:
                                          "Marked advanced · sample only, not saved.",
                                      }))
                                    }
                                  >
                                    Advanced
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setResolvedQueue((current) => ({
                                        ...current,
                                        [item.id]:
                                          "Marked did not advance · sample only, not saved.",
                                      }))
                                    }
                                  >
                                    Did not advance
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      setResolvedQueue((current) => ({
                                        ...current,
                                        [item.id]:
                                          "Closed won · sample only, not saved.",
                                      }))
                                    }
                                  >
                                    Closed won
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setResolvedQueue((current) => ({
                                        ...current,
                                        [item.id]:
                                          "Closed lost · sample only, not saved.",
                                      }))
                                    }
                                  >
                                    Closed lost
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
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
                CSV import is how the interview dataset will load. This shell
                shows the intended contract: validate everything, preview,
                then commit all rows or none.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setPreviewOpen(true)
                  setImportMessage(null)
                }}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-10 text-center hover:bg-muted/70"
              >
                <Upload className="size-5 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Drop a CSV here, or click to preview the sample file
                </span>
                <span className="text-xs text-muted-foreground">
                  Expected columns: opportunity, play, run date, prerequisite
                  checks, exception reason, advancement, close status
                </span>
              </button>

              {previewOpen ? (
                <div className="overflow-hidden rounded-xl border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Row</th>
                        <th className="px-3 py-2 font-medium">Opportunity</th>
                        <th className="px-3 py-2 font-medium">Play</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreviewRows.map((row) => (
                        <tr key={row.row} className="border-t">
                          <td className="px-3 py-2">{row.row}</td>
                          <td className="px-3 py-2">{row.opportunity}</td>
                          <td className="px-3 py-2">{row.play}</td>
                          <td className="px-3 py-2">
                            <span
                              className={
                                row.status === "error"
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
                      1 of 3 rows failed validation. Nothing will be imported
                      until the file is clean.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setImportMessage(
                          "Import refused. Partial loads are not allowed — fix row 4 and preview again."
                        )
                      }
                    >
                      Import anyway
                    </Button>
                  </div>
                </div>
              ) : null}

              {importMessage ? (
                <p className="flex items-start gap-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  {importMessage}
                </p>
              ) : null}
            </CardContent>
          </Card>
      ) : null}
    </div>
  )
}
