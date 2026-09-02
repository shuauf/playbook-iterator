"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, History, Plus } from "lucide-react"

import { IntentBadge } from "@/components/finding-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
import {
  addPrerequisiteAction,
  reorderPrerequisiteAction,
  setPlayStatusAction,
  setPrerequisiteStatusAction,
  updatePlayAction,
  updatePrerequisiteAction,
} from "@/lib/playbook/actions"
import {
  TYPICAL_STAGES,
  type PlayDto,
  type PrerequisiteIntent,
} from "@/lib/playbook/types"
import { cn } from "@/lib/utils"

type ActionResult = { ok: true; id?: string } | { ok: false; error: string }

export function PlayEditor({
  play,
  pending,
  run,
}: {
  play: PlayDto
  pending: boolean
  run: (
    action: () => Promise<ActionResult>,
    success: string,
    onOk?: (id?: string) => void
  ) => void
}) {
  const [draft, setDraft] = useState({
    name: play.name,
    typicalStage: play.typicalStage,
    purpose: play.purpose,
  })
  const [newPrereq, setNewPrereq] = useState({
    text: "",
    intent: "required" as PrerequisiteIntent,
  })
  const [historyOpen, setHistoryOpen] = useState(true)

  const dirty =
    draft.name !== play.name ||
    draft.typicalStage !== play.typicalStage ||
    draft.purpose !== play.purpose
  const activePrereqs = play.prerequisites.filter((item) => item.status === "active")
  const retiredPrereqs = play.prerequisites.filter(
    (item) => item.status === "retired"
  )

  return (
    <Card id="play-editor" className="bg-card scroll-mt-28">
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Label htmlFor="play-name">Play name</Label>
            <Input
              id="play-name"
              className="font-heading mt-1 h-auto py-2 text-xl"
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({ ...current, name: event.target.value }))
              }
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {play.status === "retired" ? "Retired" : "Active"} · definition v
              {play.definitionVersion}
            </p>
          </div>
            {play.status === "active" ? (
              <Button
                variant="outline"
                onClick={() =>
                  run(
                    () => setPlayStatusAction(play.id, "retired"),
                    `${draft.name || play.name} retired. Switch to All to see it again.`
                  )
                }
              >
                Retire play
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() =>
                  run(
                    () => setPlayStatusAction(play.id, "active"),
                    `${play.name} reactivated.`
                  )
                }
              >
                Reactivate
              </Button>
            )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <section>
          <Label htmlFor="play-stage">Typical stage</Label>
          <Select
            value={draft.typicalStage}
            onValueChange={(value) =>
              setDraft((current) => ({
                ...current,
                typicalStage: String(value),
              }))
            }
          >
            <SelectTrigger id="play-stage" className="mt-1 w-full max-w-[220px]">
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
        </section>

        <section>
          <Label htmlFor="play-purpose">Purpose</Label>
          <Textarea
            id="play-purpose"
            className="mt-1 min-h-28"
            value={draft.purpose}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                purpose: event.target.value,
              }))
            }
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {dirty
                ? "Unsaved edits to this play’s current definition."
                : "This is the current hypothesis, not a rewrite of older runs."}
            </p>
            <Button
              disabled={!dirty || pending}
              onClick={() =>
                run(() => updatePlayAction(play.id, draft), "Play saved.")
              }
            >
              Save play
            </Button>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Prerequisites
          </h2>
          <ol className="space-y-2">
            {activePrereqs.map((item, index) => (
              <li
                key={item.id}
                className="flex items-start gap-2 rounded-xl border border-border/80 bg-background/60 p-3"
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    aria-label="Move up"
                    className="rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                    disabled={index === 0 || pending}
                    onClick={() =>
                      run(
                        () => reorderPrerequisiteAction(item.id, -1),
                        "Prerequisite order saved."
                      )
                    }
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    className="rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                    disabled={index === activePrereqs.length - 1 || pending}
                    onClick={() =>
                      run(
                        () => reorderPrerequisiteAction(item.id, 1),
                        "Prerequisite order saved."
                      )
                    }
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <Textarea
                    key={`${item.id}-${item.text}`}
                    defaultValue={item.text}
                    rows={2}
                    className="min-h-0"
                    onBlur={(event) => {
                      const next = event.target.value.trim()
                      if (!next || next === item.text) return
                      run(
                        () => updatePrerequisiteAction(item.id, { text: next }),
                        "Prerequisite wording saved."
                      )
                    }}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () =>
                            updatePrerequisiteAction(item.id, {
                              intent:
                                item.intent === "required"
                                  ? "recommended"
                                  : "required",
                            }),
                          "Prerequisite intent saved."
                        )
                      }
                    >
                      <IntentBadge intent={item.intent} />
                    </button>
                    <Button
                      size="xs"
                      variant="ghost"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => setPrerequisiteStatusAction(item.id, "retired"),
                          "Prerequisite retired. It remains in history."
                        )
                      }
                    >
                      Retire
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ol>

          {play.status === "active" ? (
            <div className="mt-3 space-y-2 rounded-xl border border-dashed bg-muted/30 p-3">
              <Label htmlFor="new-prereq">Add a prerequisite</Label>
              <Textarea
                id="new-prereq"
                rows={2}
                value={newPrereq.text}
                onChange={(event) =>
                  setNewPrereq((current) => ({
                    ...current,
                    text: event.target.value,
                  }))
                }
                placeholder="What should be true before this play is run?"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-1 rounded-lg bg-muted p-0.5 text-xs">
                  {(["required", "recommended"] as const).map((intent) => (
                    <button
                      key={intent}
                      type="button"
                      onClick={() =>
                        setNewPrereq((current) => ({ ...current, intent }))
                      }
                      className={cn(
                        "rounded-md px-2 py-1 capitalize",
                        newPrereq.intent === intent &&
                          "bg-card text-foreground shadow-sm"
                      )}
                    >
                      {intent}
                    </button>
                  ))}
                </div>
                <Button
                  size="sm"
                  disabled={pending || !newPrereq.text.trim()}
                  onClick={() =>
                    run(
                      () => addPrerequisiteAction(play.id, newPrereq),
                      "Prerequisite added.",
                      () => setNewPrereq({ text: "", intent: "required" })
                    )
                  }
                >
                  <Plus data-icon="inline-start" />
                  Add
                </Button>
              </div>
            </div>
          ) : null}

          {retiredPrereqs.length > 0 ? (
            <div className="mt-4 space-y-2">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Retired prerequisites
              </h3>
              {retiredPrereqs.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground"
                >
                  <span>{item.text}</span>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() =>
                      run(
                        () => setPrerequisiteStatusAction(item.id, "active"),
                        "Prerequisite reactivated."
                      )
                    }
                  >
                    Reactivate
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
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
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
              {play.history.length === 0 ? (
                <li>No recorded changes yet.</li>
              ) : (
                play.history.map((event) => (
                  <li key={event.id}>
                    <span className="font-medium text-foreground/80">
                      {event.at}
                    </span>
                    {" — "}
                    {event.summary}
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </section>
      </CardContent>
    </Card>
  )
}
