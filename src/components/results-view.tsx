"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowRight, Info } from "lucide-react"

import { EvidenceBadge, FindingBadge, IntentBadge } from "@/components/finding-badge"
import { PageIntro } from "@/components/page-intro"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { analyze } from "@/analysis/engine"
import { DEFAULT_THRESHOLDS } from "@/analysis/thresholds"
import type { AnalysisFilters, AnalysisInput, PrerequisiteFinding, Thresholds } from "@/analysis/types"
import { formatDays, pct } from "@/lib/format"
import { SEGMENTS, TYPICAL_STAGES } from "@/lib/playbook/types"
import { cn } from "@/lib/utils"

const accent: Record<PrerequisiteFinding["recommendation"], string> = {
  enforce: "border-l-[oklch(0.62_0.16_25)]",
  retire: "border-l-[oklch(0.55_0.1_250)]",
  reclassify: "border-l-[oklch(0.55_0.14_310)]",
  investigate: "border-l-[oklch(0.68_0.14_70)]",
  insufficient: "border-l-border",
}

export function ResultsView({ input }: { input: AnalysisInput }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [playFilter, setPlayFilter] = useState("all")
  const [stageFilter, setStageFilter] = useState("all")
  const [segmentFilter, setSegmentFilter] = useState("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [thresholds, setThresholds] = useState<Thresholds>(DEFAULT_THRESHOLDS)

  const filters: AnalysisFilters = useMemo(
    () => ({
      playId: playFilter === "all" ? undefined : playFilter,
      typicalStage: stageFilter === "all" ? undefined : stageFilter,
      segment: segmentFilter === "all" ? undefined : segmentFilter,
      fromMs: fromDate ? new Date(fromDate).getTime() : undefined,
      toMs: toDate ? new Date(toDate).getTime() + 86_400_000 - 1 : undefined,
    }),
    [playFilter, stageFilter, segmentFilter, fromDate, toDate]
  )

  const result = useMemo(() => analyze(input, filters, thresholds), [input, filters, thresholds])
  const plays = [...new Map(input.runs.map((run) => [run.playId, run.playName])).entries()]
  const selected =
    result.findings.find((item) => item.id === selectedId) ?? result.findings[0] ?? null

  if (input.runs.length === 0) {
    return (
      <div>
        <PageIntro kicker="Results" title="Start with the decisions">
          Log play runs and close a few opportunities, or load the interview dataset
          from the Log tab, before this page can show comparison-group math.
        </PageIntro>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No play runs yet. Results stay empty until there is something to compare.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageIntro kicker="Results" title="Start with the decisions">
        Four comparison findings first, then a leadership review queue. Every rate
        shows both sample sizes. Open opportunities are excluded from win rate.
        Lost opportunities are excluded from won-cycle time. Cycle time never
        feeds enforce or retire.
      </PageIntro>

      <div className="mb-6 grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2 xl:grid-cols-4">
        <FilterField label="Play">
          <Select value={playFilter} onValueChange={(value) => setPlayFilter(String(value))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plays</SelectItem>
              {plays.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Typical stage">
          <Select value={stageFilter} onValueChange={(value) => setStageFilter(String(value))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {TYPICAL_STAGES.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {stage}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Segment">
          <Select value={segmentFilter} onValueChange={(value) => setSegmentFilter(String(value))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All segments</SelectItem>
              {SEGMENTS.map((segment) => (
                <SelectItem key={segment} value={segment}>
                  {segment}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <div className="grid grid-cols-2 gap-2">
          <FilterField label="From">
            <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </FilterField>
          <FilterField label="To">
            <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </FilterField>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="font-heading text-xl">Comparison findings</h2>
        <p className="mt-1 mb-4 max-w-3xl text-sm text-muted-foreground">
          Exception rate uses every run. Win rate uses closed opportunities only.
          Advancement uses opportunities with a recorded advancement judgment.
          Cycle time uses won opportunities only.
        </p>
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prerequisite</TableHead>
                  <TableHead className="text-right">Exception rate</TableHead>
                  <TableHead className="text-right">Win met / unmet</TableHead>
                  <TableHead className="text-right">Advanced met / unmet</TableHead>
                  <TableHead className="text-right">Won cycle met / unmet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.metrics.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-[280px] whitespace-normal">
                      <span className="block text-xs text-muted-foreground">
                        {row.playName} · {row.typicalStage}
                      </span>
                      {row.prerequisite}
                    </TableCell>
                    <TableCell className="text-right">
                      {pct(row.skipRate)}
                      <span className="block text-xs text-muted-foreground">
                        n = {row.nRuns} ({row.nMet} met / {row.nUnmet} unmet)
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {fmtRate(row.win.rateMet)} / {fmtRate(row.win.rateUnmet)}
                      <span className="block text-xs text-muted-foreground">
                        n = {row.win.nMet} / {row.win.nUnmet}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {fmtRate(row.advancement.rateMet)} / {fmtRate(row.advancement.rateUnmet)}
                      <span className="block text-xs text-muted-foreground">
                        n = {row.advancement.nMet} / {row.advancement.nUnmet}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatDays(row.wonCycle.medianMet)} / {formatDays(row.wonCycle.medianUnmet)}
                      <span className="block text-xs text-muted-foreground">
                        n = {row.wonCycle.nMet} / {row.wonCycle.nUnmet}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-muted/40 p-3">
        <p className="w-full text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Review thresholds
        </p>
        <ThresholdInput
          label="Min arm (insufficient below)"
          value={thresholds.minArmInsufficient}
          onChange={(value) => setThresholds((current) => ({ ...current, minArmInsufficient: value }))}
        />
        <ThresholdInput
          label="Min arm (supported)"
          value={thresholds.minArmSupported}
          onChange={(value) => setThresholds((current) => ({ ...current, minArmSupported: value }))}
        />
        <ThresholdInput
          label="Material gap (pp)"
          value={Math.round(thresholds.materialPp * 100)}
          onChange={(value) => setThresholds((current) => ({ ...current, materialPp: value / 100 }))}
        />
        <ThresholdInput
          label="Equivalence (pp)"
          value={Math.round(thresholds.equivalencePp * 100)}
          onChange={(value) => setThresholds((current) => ({ ...current, equivalencePp: value / 100 }))}
        />
        <ThresholdInput
          label="Min skip to retire (%)"
          value={Math.round(thresholds.minSkipForRetire * 100)}
          onChange={(value) => setThresholds((current) => ({ ...current, minSkipForRetire: value / 100 }))}
        />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-2">
            <h2 className="font-heading text-xl">Playbook review queue</h2>
            <p className="text-xs text-muted-foreground">
              {result.findings.length} finding{result.findings.length === 1 ? "" : "s"}
            </p>
          </div>
          {result.findings.map((finding) => (
            <button
              key={finding.id}
              type="button"
              onClick={() => {
                setSelectedId(finding.id)
                requestAnimationFrame(() => {
                  document
                    .getElementById("finding-evidence")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                })
              }}
              className={cn(
                "w-full rounded-xl border border-l-4 bg-card p-4 text-left shadow-[0_1px_0_rgba(28,25,23,0.03)] transition-colors",
                accent[finding.recommendation],
                (selected?.id ?? "") === finding.id
                  ? "ring-2 ring-[oklch(0.55_0.07_175)]"
                  : "hover:bg-card/80"
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <FindingBadge label={finding.recommendation} />
                <EvidenceBadge strength={finding.evidence} />
                <span className="text-xs text-muted-foreground">
                  {finding.playName} · skip {pct(finding.skipRate)} · n {finding.nMet + finding.nUnmet}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium">{finding.prerequisite}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{finding.summary}</p>
            </button>
          ))}
        </div>

        {selected ? (
          <Card id="finding-evidence" className="scroll-mt-28 xl:sticky xl:top-36">
            <CardHeader className="border-b">
              <div className="flex flex-wrap gap-2">
                <FindingBadge label={selected.recommendation} />
                <EvidenceBadge strength={selected.evidence} />
                <IntentBadge intent={selected.intent} />
              </div>
              <CardTitle className="font-heading text-xl leading-snug">
                {selected.prerequisite}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {selected.playName} · {selected.typicalStage}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">{selected.summary}</p>
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Why this label
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{selected.why}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Stat
                  label="Win rate when met"
                  value={fmtRate(selected.win.rateMet)}
                  hint={`n = ${selected.win.nMet} closed`}
                />
                <Stat
                  label="Win rate when unmet"
                  value={fmtRate(selected.win.rateUnmet)}
                  hint={`n = ${selected.win.nUnmet} closed`}
                />
                <Stat
                  label="Advanced when met"
                  value={fmtRate(selected.advancement.rateMet)}
                  hint={`n = ${selected.advancement.nMet} resolved`}
                />
                <Stat
                  label="Advanced when unmet"
                  value={fmtRate(selected.advancement.rateUnmet)}
                  hint={`n = ${selected.advancement.nUnmet} resolved`}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Win-rate difference {fmtDiff(selected.win.diff)} (95% interval {fmtDiff(selected.win.ciLo)} to {fmtDiff(selected.win.ciHi)}).
                Won-cycle medians {formatDays(selected.wonCycle.medianMet)} vs {formatDays(selected.wonCycle.medianUnmet)} (n = {selected.wonCycle.nMet} / {selected.wonCycle.nUnmet}); cycle time is descriptive only.
              </p>
              <p className="flex gap-2 rounded-lg bg-muted/70 px-3 py-2 text-sm leading-relaxed text-muted-foreground">
                <Info className="mt-0.5 size-4 shrink-0" />
                {selected.limitation}
              </p>
              <p className="text-xs text-muted-foreground">
                {selected.recordIds.length} underlying play run{selected.recordIds.length === 1 ? "" : "s"} produced this finding.
              </p>
              <Link href={`/config?play=${selected.playId}`} className={buttonVariants()}>
                Open this play in Config
                <ArrowRight data-icon="inline-end" />
              </Link>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <section className="mt-10 space-y-6">
        <div>
          <h2 className="font-heading text-xl">Descriptive views</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {result.secondary.stageCaveat}
          </p>
        </div>

        {result.secondary.playsByStage.map((group) => (
          <Card key={group.stage}>
            <CardHeader className="border-b">
              <CardTitle>Outcomes · {group.stage} stage</CardTitle>
              <p className="text-sm text-muted-foreground">
                Plays in this band only. Do not read them against another stage.
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Play</TableHead>
                    <TableHead className="text-right">Runs</TableHead>
                    <TableHead className="text-right">Exception rate</TableHead>
                    <TableHead className="text-right">Closed win rate</TableHead>
                    <TableHead className="text-right">Days to advance</TableHead>
                    <TableHead className="text-right">Days to won close</TableHead>
                    <TableHead>Read as</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.rows.map((row) => (
                    <TableRow key={row.playId}>
                      <TableCell className="font-medium">{row.playName}</TableCell>
                      <TableCell className="text-right">{row.runs}</TableCell>
                      <TableCell className="text-right">{pct(row.exceptionRate)}</TableCell>
                      <TableCell className="text-right">
                        {fmtRate(row.winRate)}
                        <span className="block text-xs text-muted-foreground">n = {row.nWin}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatDays(row.medianDaysToAdvance)}
                        <span className="block text-xs text-muted-foreground">n = {row.nAdvanceDays}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatDays(row.medianDaysToCloseWon)}
                        <span className="block text-xs text-muted-foreground">n = {row.nWonCycle}</span>
                      </TableCell>
                      <TableCell className="max-w-[240px] whitespace-normal text-muted-foreground">
                        {row.note}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Exceptions per run</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exceptions</TableHead>
                    <TableHead className="text-right">n</TableHead>
                    <TableHead className="text-right">Win</TableHead>
                    <TableHead className="text-right">Advanced</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.secondary.stackedExceptions.map((row) => (
                    <TableRow key={row.stack}>
                      <TableCell>{row.label}</TableCell>
                      <TableCell className="text-right">{row.n}</TableCell>
                      <TableCell className="text-right">
                        {fmtRate(row.winRate)}{" "}
                        <span className="text-xs text-muted-foreground">(n = {row.nWin})</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtRate(row.advancementRate)}{" "}
                        <span className="text-xs text-muted-foreground">(n = {row.nAdvancement})</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Required versus recommended exceptions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Intent</TableHead>
                    <TableHead className="text-right">Skip</TableHead>
                    <TableHead className="text-right">Win when unmet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.secondary.intentExceptions.map((row) => (
                    <TableRow key={row.intent}>
                      <TableCell className="capitalize">{row.intent}</TableCell>
                      <TableCell className="text-right">
                        {pct(row.skipRate)}
                        <span className="block text-xs text-muted-foreground">
                          {row.unmet} / {row.checks}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtRate(row.winRateWhenUnmet)}
                        <span className="block text-xs text-muted-foreground">
                          n = {row.closedUnmet}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Exception reasons and their outcomes</CardTitle>
            <p className="text-sm text-muted-foreground">
              Closed opportunities that used the reason on the latest run of that play.
              Coaching context, not a causal ranking.
            </p>
          </CardHeader>
          <CardContent>
            {result.secondary.reasonOutcomes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No exception reasons recorded in this filter.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {result.secondary.reasonOutcomes.map((row) => (
                  <div
                    key={row.reasonId}
                    className="min-w-[160px] flex-1 rounded-xl border bg-background/70 px-3 py-2.5"
                  >
                    <p className="text-sm font-medium">{row.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      n = {row.n} · closed {row.closed} · win {fmtRate(row.winRate)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Trends over time</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Runs</TableHead>
                  <TableHead className="text-right">Exception rate</TableHead>
                  <TableHead className="text-right">Closed win rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.secondary.trends.map((row) => (
                  <TableRow key={row.monthMs}>
                    <TableCell>{row.month}</TableCell>
                    <TableCell className="text-right">{row.runs}</TableCell>
                    <TableCell className="text-right">{pct(row.exceptionRate)}</TableCell>
                    <TableCell className="text-right">
                      {fmtRate(row.winRate)}
                      <span className="text-xs text-muted-foreground"> (n = {row.closed})</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function fmtRate(value: number | null) {
  return value === null ? "—" : pct(value)
}

function fmtDiff(value: number | null) {
  if (value === null) return "—"
  const points = value * 100
  const sign = points > 0 ? "+" : ""
  return `${sign}${points.toFixed(0)} pp`
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium">
      <span className="mb-1.5 block text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function ThresholdInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="text-xs">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      <Input
        type="number"
        className="h-8 w-28"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-xl bg-muted/50 px-3 py-2.5">
      <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="font-heading text-2xl">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}
