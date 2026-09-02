"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowRight, Info } from "lucide-react"

import { FindingBadge } from "@/components/finding-badge"
import { PageIntro } from "@/components/page-intro"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  exceptionReasonPerformance,
  findings,
  playMetrics,
  skipRates,
  stackedExceptions,
  type Finding,
} from "@/data/sample"
import { pct } from "@/lib/format"
import { cn } from "@/lib/utils"

const accent: Record<Finding["label"], string> = {
  enforce: "border-l-[oklch(0.62_0.16_25)]",
  retire: "border-l-[oklch(0.55_0.1_250)]",
  reclassify: "border-l-[oklch(0.55_0.14_310)]",
  investigate: "border-l-[oklch(0.68_0.14_70)]",
  insufficient: "border-l-border",
}

export function ResultsView() {
  const [selectedId, setSelectedId] = useState(findings[0].id)
  const [playFilter, setPlayFilter] = useState("all")
  const selected = findings.find((item) => item.id === selectedId) ?? findings[0]

  const visibleFindings = useMemo(
    () =>
      playFilter === "all"
        ? findings
        : findings.filter((item) => item.playId === playFilter),
    [playFilter]
  )

  return (
    <div>
      <PageIntro kicker="Results" title="Start with the decisions">
        The review queue is the product. Charts come after a finding, not
        before it. Every comparison below is within a play, and every number
        carries its sample size.         Open opportunities stay visible in usage views
        and are excluded from win-rate math. Findings on this tab are still
        illustrative sample output until play runs are stored.
      </PageIntro>

      <div className="mb-5 flex flex-wrap gap-2">
        <FilterChip
          active={playFilter === "all"}
          onClick={() => setPlayFilter("all")}
        >
          All plays
        </FilterChip>
        {["product-demo", "architecture-deep-dive", "proof-of-concept", "custom-demo"].map(
          (id) => (
            <FilterChip
              key={id}
              active={playFilter === id}
              onClick={() => {
                setPlayFilter(id)
                const next = findings.find((item) => item.playId === id)
                if (next) setSelectedId(next.id)
              }}
            >
              {id === "product-demo"
                ? "Product Demo"
                : id === "architecture-deep-dive"
                  ? "Architecture Deep Dive"
                  : id === "proof-of-concept"
                    ? "Proof of Concept"
                    : "Custom Demo"}
            </FilterChip>
          )
        )}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-2">
            <h2 className="font-heading text-xl">Playbook review queue</h2>
            <p className="text-xs text-muted-foreground">
              {visibleFindings.length} finding
              {visibleFindings.length === 1 ? "" : "s"} · sample corpus
            </p>
          </div>
          {visibleFindings.map((finding) => (
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
                accent[finding.label],
                selectedId === finding.id
                  ? "ring-2 ring-[oklch(0.55_0.07_175)]"
                  : "hover:bg-card/80"
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <FindingBadge label={finding.label} />
                <span className="text-xs text-muted-foreground">
                  {finding.playName} · skip {pct(finding.skipRate)} · n{" "}
                  {finding.nMet + finding.nUnmet}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium">{finding.prerequisite}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {finding.summary}
              </p>
              {selectedId === finding.id ? (
                <p className="mt-3 text-xs font-medium text-[oklch(0.38_0.06_175)]">
                  Evidence is open in the panel
                  <span className="xl:hidden"> below</span>.
                </p>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  Open evidence
                </p>
              )}
            </button>
          ))}
          {visibleFindings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No findings for that filter in the sample set.
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card id="finding-evidence" className="scroll-mt-28 xl:sticky xl:top-36">
          <CardHeader className="border-b">
            <FindingBadge label={selected.label} />
            <CardTitle className="font-heading text-xl leading-snug">
              {selected.prerequisite}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {selected.playName} · confidence {selected.confidence}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Stat
                label="Win rate when met"
                value={pct(selected.winMet)}
                hint={`n = ${selected.nMet} closed`}
              />
              <Stat
                label="Win rate when unmet"
                value={pct(selected.winUnmet)}
                hint={`n = ${selected.nUnmet} closed`}
              />
              <Stat
                label="Advanced when met"
                value={pct(selected.advMet)}
                hint="Advancement resolved"
              />
              <Stat
                label="Advanced when unmet"
                value={pct(selected.advUnmet)}
                hint="Advancement resolved"
              />
            </div>
            <p className="flex gap-2 rounded-lg bg-muted/70 px-3 py-2 text-sm leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" />
              {selected.limitation}
            </p>
            <Link
              href={`/config?play=${selected.playId}`}
              className={buttonVariants()}
            >
              Open this play in Config
              <ArrowRight data-icon="inline-end" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <section className="mt-10 space-y-6">
        <div>
          <h2 className="font-heading text-xl">Descriptive views</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Supporting evidence only. Plays are not ranked against each other.
            Proof of Concept sits later in the cycle, so its win rate and
            remaining cycle time are expected to look better.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Prerequisite skip frequency</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Play / prerequisite</TableHead>
                    <TableHead>Intent</TableHead>
                    <TableHead className="text-right">Skip</TableHead>
                    <TableHead className="text-right">n</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skipRates.map((row) => (
                    <TableRow key={`${row.play}-${row.prerequisite}`}>
                      <TableCell className="max-w-[260px] whitespace-normal">
                        <span className="block text-xs text-muted-foreground">
                          {row.play}
                        </span>
                        {row.prerequisite}
                      </TableCell>
                      <TableCell>{row.intent}</TableCell>
                      <TableCell className="text-right">{pct(row.skipRate)}</TableCell>
                      <TableCell className="text-right">{row.n}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Stacked exceptions, Product Demo</CardTitle>
              <p className="text-sm text-muted-foreground">
                Closed Product Demo opportunities. One row per opportunity.
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exceptions in the run</TableHead>
                    <TableHead className="text-right">n</TableHead>
                    <TableHead className="text-right">Win</TableHead>
                    <TableHead className="text-right">Advanced</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stackedExceptions.map((row) => (
                    <TableRow key={row.stack}>
                      <TableCell>{row.stack}</TableCell>
                      <TableCell className="text-right">{row.n}</TableCell>
                      <TableCell className="text-right">{pct(row.winRate)}</TableCell>
                      <TableCell className="text-right">{pct(row.advRate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Usage by play</CardTitle>
            <p className="text-sm text-muted-foreground">
              Win rate is shown only for closed opportunities inside that play.
              It is descriptive — not a leaderboard.
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Play</TableHead>
                  <TableHead>Stage band</TableHead>
                  <TableHead className="text-right">Runs</TableHead>
                  <TableHead className="text-right">Exception rate</TableHead>
                  <TableHead className="text-right">Closed win rate</TableHead>
                  <TableHead>Read as</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {playMetrics.map((row) => (
                  <TableRow key={row.play}>
                    <TableCell className="font-medium">{row.play}</TableCell>
                    <TableCell>{row.typicalStage}</TableCell>
                    <TableCell className="text-right">{row.runs}</TableCell>
                    <TableCell className="text-right">
                      {pct(row.exceptionRate)}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.winRate === null ? "—" : pct(row.winRate)}
                    </TableCell>
                    <TableCell className="max-w-[280px] whitespace-normal text-muted-foreground">
                      {row.note ?? "Within-play description only."}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Exception reasons</CardTitle>
            <p className="text-sm text-muted-foreground">
              Closed runs that used the reason, across plays. Useful for
              coaching conversations; not a causal ranking.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {exceptionReasonPerformance.map((row) => (
                <div
                  key={row.reason}
                  className="min-w-[160px] flex-1 rounded-xl border bg-background/70 px-3 py-2.5"
                >
                  <p className="text-sm font-medium">{row.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    n = {row.n} · win {pct(row.winRate)}
                  </p>
                  {row.note ? (
                    <p className="mt-1 text-xs text-muted-foreground">{row.note}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-[oklch(0.55_0.07_175)] bg-[oklch(0.35_0.055_175)] text-primary-foreground"
          : "border-border bg-card text-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
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
      <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="font-heading text-2xl">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}
