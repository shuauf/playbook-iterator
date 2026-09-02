"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  ChevronDown,
  ChevronUp,
  History,
  MoreHorizontal,
  Plus,
} from "lucide-react"

import { IntentBadge } from "@/components/finding-badge"
import { PageIntro } from "@/components/page-intro"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { exceptionReasons, plays, type Play } from "@/data/sample"
import { cn } from "@/lib/utils"

export function ConfigView() {
  const searchParams = useSearchParams()
  const requested = searchParams.get("play")
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active")
  const [selectedId, setSelectedId] = useState(
    requested && plays.some((play) => play.id === requested)
      ? requested
      : "product-demo"
  )
  const [drafts, setDrafts] = useState<Play[]>(plays)
  const [historyOpen, setHistoryOpen] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)

  const visiblePlays = useMemo(
    () =>
      drafts.filter((play) =>
        statusFilter === "active" ? play.status === "active" : true
      ),
    [drafts, statusFilter]
  )

  const selected =
    drafts.find((play) => play.id === selectedId) ?? drafts[0]

  function flash(message: string) {
    setNotice(message)
  }

  function movePrerequisite(index: number, direction: -1 | 1) {
    const nextIndex = index + direction
    if (!selected || nextIndex < 0 || nextIndex >= selected.prerequisites.length) {
      return
    }
    setDrafts((current) =>
      current.map((play) => {
        if (play.id !== selected.id) return play
        const prerequisites = [...play.prerequisites]
        const [item] = prerequisites.splice(index, 1)
        prerequisites.splice(nextIndex, 0, item)
        return { ...play, prerequisites }
      })
    )
  }

  function toggleIntent(id: string) {
    if (!selected) return
    setDrafts((current) =>
      current.map((play) => {
        if (play.id !== selected.id) return play
        return {
          ...play,
          prerequisites: play.prerequisites.map((item) =>
            item.id === id
              ? {
                  ...item,
                  intent:
                    item.intent === "required" ? "recommended" : "required",
                }
              : item
          ),
        }
      })
    )
    flash(
      "Intent changed in this session only. A real save would write a new playbook version and leave past runs on the old definition."
    )
  }

  function retirePlay() {
    if (!selected) return
    setDrafts((current) =>
      current.map((play) =>
        play.id === selected.id ? { ...play, status: "retired" } : play
      )
    )
    flash(
      `${selected.name} marked retired in this session. Historical runs would remain attached to the definition used when they were logged.`
    )
  }

  function addPrerequisite() {
    if (!selected) return
    const id = `new-${Date.now()}`
    setDrafts((current) =>
      current.map((play) => {
        if (play.id !== selected.id) return play
        return {
          ...play,
          prerequisites: [
            ...play.prerequisites,
            {
              id,
              text: "New prerequisite — edit this copy",
              intent: "recommended",
            },
          ],
        }
      })
    )
    flash("Prerequisite added locally. Persistence and versioning come in a later phase.")
  }

  return (
    <div>
      <PageIntro kicker="Config" title="The living playbook">
        This is how the team currently intends to work — not an admin console.
        Choose a play, inspect its prerequisites, and treat required versus
        recommended as a hypothesis you can later test in Results.
      </PageIntro>

      {notice ? (
        <div className="mb-5 rounded-xl border border-[oklch(0.82_0.05_175)] bg-[oklch(0.97_0.02_175)] px-4 py-3 text-sm text-[oklch(0.32_0.05_175)]">
          {notice}
        </div>
      ) : null}

      <div className="grid items-start gap-6 xl:grid-cols-[280px_minmax(0,1fr)_280px]">
        <Card className="bg-card/80">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Sales plays</CardTitle>
              <div className="flex rounded-lg bg-muted p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter("active")}
                  className={cn(
                    "rounded-md px-2 py-1",
                    statusFilter === "active" && "bg-card text-foreground shadow-sm"
                  )}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={cn(
                    "rounded-md px-2 py-1",
                    statusFilter === "all" && "bg-card text-foreground shadow-sm"
                  )}
                >
                  All
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 py-2">
            <ul className="flex flex-col">
              {visiblePlays.map((play) => (
                <li key={play.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(play.id)
                      setNotice(null)
                    }}
                    className={cn(
                      "flex w-full items-start justify-between gap-2 rounded-lg px-2.5 py-2.5 text-left transition-colors",
                      selected.id === play.id
                        ? "bg-[oklch(0.95_0.025_175)]"
                        : "hover:bg-muted/70"
                    )}
                  >
                    <span>
                      <span className="block text-sm font-medium">{play.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {play.typicalStage} · {play.prerequisites.length}{" "}
                        prerequisites
                      </span>
                    </span>
                    {play.status === "retired" ? (
                      <Badge variant="secondary">Retired</Badge>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
            <Button variant="outline" className="mt-2 w-full" onClick={() => flash("Creating a play will be a Config action in Phase 2. This shell keeps the playbook list as the primary object.")}>
              <Plus data-icon="inline-start" />
              New play
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="border-b">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Typical stage</p>
                <CardTitle className="font-heading text-2xl">
                  {selected.name}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selected.typicalStage}
                  {selected.status === "retired" ? " · Retired" : " · Active"}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Play actions"
                  className={buttonVariants({ variant: "outline", size: "icon" })}
                >
                  <MoreHorizontal />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setHistoryOpen(true)}>
                    View history
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      flash("Duplicate will copy this play’s current prerequisites into a new play.")
                    }
                  >
                    Duplicate play
                  </DropdownMenuItem>
                  {selected.status === "active" ? (
                    <DropdownMenuItem onClick={retirePlay}>
                      Retire play
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Purpose
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed">{selected.purpose}</p>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Prerequisites
                </h2>
                <Button size="sm" variant="outline" onClick={addPrerequisite}>
                  <Plus data-icon="inline-start" />
                  Add
                </Button>
              </div>
              <ol className="space-y-2">
                {selected.prerequisites.map((item, index) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-2 rounded-xl border border-border/80 bg-background/60 p-3"
                  >
                    <div className="flex flex-col">
                      <button
                        type="button"
                        aria-label="Move up"
                        className="rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                        disabled={index === 0}
                        onClick={() => movePrerequisite(index, -1)}
                      >
                        <ChevronUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Move down"
                        className="rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                        disabled={index === selected.prerequisites.length - 1}
                        onClick={() => movePrerequisite(index, 1)}
                      >
                        <ChevronDown className="size-3.5" />
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">{item.text}</p>
                      <button
                        type="button"
                        className="mt-2"
                        onClick={() => toggleIntent(item.id)}
                      >
                        <IntentBadge intent={item.intent} />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-muted-foreground">
                Click a required/recommended badge to flip intent. Reorder with
                the arrows. In production, material edits write a new version.
              </p>
            </section>

            <section className="rounded-xl border border-dashed border-border bg-muted/40 p-3">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => setHistoryOpen((open) => !open)}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <History className="size-4" />
                  History stays attached
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    historyOpen && "rotate-180"
                  )}
                />
              </button>
              {historyOpen ? (
                <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
                  <p>{selected.lastMaterialChange}</p>
                  <p>{selected.historyNote}</p>
                </div>
              ) : null}
            </section>
          </CardContent>
        </Card>

        <Card className="bg-card/80">
          <CardHeader className="border-b">
            <CardTitle>Exception reasons</CardTitle>
            <p className="text-sm text-muted-foreground">
              The vocabulary SEs use when a prerequisite is unmet. Keep this list
              short and stable.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {exceptionReasons.map((reason) => (
              <div
                key={reason.id}
                className="rounded-lg border border-border/70 bg-background/70 px-3 py-2"
              >
                <p className="text-sm font-medium">{reason.label}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {reason.description}
                </p>
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                flash("Reason taxonomy is versioned separately so old runs keep the label that was chosen.")
              }
            >
              <Plus data-icon="inline-start" />
              Add reason
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
