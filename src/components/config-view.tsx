"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Plus } from "lucide-react"

import { PlayEditor } from "@/components/config-play-editor"
import { PageIntro } from "@/components/page-intro"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  createPlayAction,
  createReasonAction,
  setReasonStatusAction,
  updateReasonAction,
} from "@/lib/playbook/actions"
import {
  TYPICAL_STAGES,
  type ExceptionReasonDto,
  type PlayDto,
} from "@/lib/playbook/types"
import { cn } from "@/lib/utils"

type ActionResult = { ok: true; id?: string } | { ok: false; error: string }

export function ConfigView({
  plays,
  reasons,
}: {
  plays: PlayDto[]
  reasons: ExceptionReasonDto[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requested = searchParams.get("play")
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active")
  const [userSelectedId, setUserSelectedId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: "",
    typicalStage: "Evaluate",
    purpose: "",
  })
  const [newReason, setNewReason] = useState({ label: "", description: "" })
  const [showRetiredReasons, setShowRetiredReasons] = useState(false)
  const [pending, startTransition] = useTransition()

  const visiblePlays = useMemo(
    () =>
      plays.filter((play) =>
        statusFilter === "active" ? play.status === "active" : true
      ),
    [plays, statusFilter]
  )

  const selectedId =
    [userSelectedId, requested].find(
      (id) => id && plays.some((play) => play.id === id)
    ) ??
    visiblePlays[0]?.id ??
    plays[0]?.id ??
    null

  const selected = plays.find((play) => play.id === selectedId) ?? null
  const activeReasons = reasons.filter((item) => item.status === "active")
  const retiredReasons = reasons.filter((item) => item.status === "retired")

  function run(
    action: () => Promise<ActionResult>,
    success: string,
    onOk?: (id?: string) => void
  ) {
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        setNotice(result.error)
        return
      }
      setNotice(success)
      onOk?.(result.id)
    })
  }

  return (
    <div>
      <PageIntro kicker="Config" title="The living playbook">
        This is how the team currently intends to work. Create plays, edit the
        current definition, and retire rules that no longer belong. Edits persist
        in the local workspace database. Past wording is kept in history so later
        play runs will not be rewritten.
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
            {visiblePlays.length === 0 ? (
              <p className="px-2.5 py-6 text-center text-sm text-muted-foreground">
                {plays.length === 0
                  ? "No plays yet. Create the first standard."
                  : "No active plays. Switch to All to see retired ones."}
              </p>
            ) : (
              <ul className="flex flex-col">
                {visiblePlays.map((play) => (
                  <li key={play.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setUserSelectedId(play.id)
                        setNotice(null)
                        router.replace(`/config?play=${play.id}`)
                      }}
                      className={cn(
                        "flex w-full items-start justify-between gap-2 rounded-lg px-2.5 py-2.5 text-left transition-colors",
                        selected?.id === play.id
                          ? "bg-[oklch(0.95_0.025_175)]"
                          : "hover:bg-muted/70"
                      )}
                    >
                      <span>
                        <span className="block text-sm font-medium">{play.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {play.typicalStage} ·{" "}
                          {
                            play.prerequisites.filter(
                              (item) => item.status === "active"
                            ).length
                          }{" "}
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
            )}
            <Button
              variant="outline"
              className="mt-2 w-full"
              onClick={() => setCreateOpen(true)}
            >
              <Plus data-icon="inline-start" />
              New play
            </Button>
          </CardContent>
        </Card>

        {selected ? (
          <PlayEditor
            key={selected.id}
            play={selected}
            pending={pending}
            run={run}
          />
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Create a sales play to define the current standard.
            </CardContent>
          </Card>
        )}

        <Card className="bg-card/80">
          <CardHeader className="border-b">
            <CardTitle>Exception reasons</CardTitle>
            <p className="text-sm text-muted-foreground">
              The vocabulary SEs use when a prerequisite is unmet. Keep this list
              short and stable.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeReasons.map((reason) => (
              <ReasonEditor
                key={reason.id}
                reason={reason}
                pending={pending}
                onSave={(input) =>
                  run(
                    () => updateReasonAction(reason.id, input),
                    "Exception reason saved."
                  )
                }
                onRetire={() =>
                  run(
                    () => setReasonStatusAction(reason.id, "retired"),
                    "Exception reason retired."
                  )
                }
              />
            ))}
            <div className="space-y-2 rounded-xl border border-dashed p-3">
              <Label htmlFor="reason-label">Add a reason</Label>
              <Input
                id="reason-label"
                value={newReason.label}
                onChange={(event) =>
                  setNewReason((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                placeholder="Label"
              />
              <Textarea
                rows={2}
                value={newReason.description}
                onChange={(event) =>
                  setNewReason((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="When this reason applies"
              />
              <Button
                variant="outline"
                className="w-full"
                disabled={
                  pending ||
                  !newReason.label.trim() ||
                  !newReason.description.trim()
                }
                onClick={() =>
                  run(
                    () => createReasonAction(newReason),
                    "Exception reason added.",
                    () => setNewReason({ label: "", description: "" })
                  )
                }
              >
                <Plus data-icon="inline-start" />
                Add reason
              </Button>
            </div>
            {retiredReasons.length > 0 ? (
              <div>
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                  onClick={() => setShowRetiredReasons((open) => !open)}
                >
                  {showRetiredReasons ? "Hide" : "Show"} retired reasons (
                  {retiredReasons.length})
                </button>
                {showRetiredReasons
                  ? retiredReasons.map((reason) => (
                      <div
                        key={reason.id}
                        className="mt-2 flex items-start justify-between gap-2 rounded-lg border border-dashed px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium">{reason.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {reason.description}
                          </p>
                        </div>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() =>
                            run(
                              () => setReasonStatusAction(reason.id, "active"),
                              "Exception reason reactivated."
                            )
                          }
                        >
                          Reactivate
                        </Button>
                      </div>
                    ))
                  : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New sales play</DialogTitle>
            <DialogDescription>
              Name the activity, the stage it usually belongs to, and why the
              team runs it. Add prerequisites after it exists.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="new-play-name">Name</Label>
              <Input
                id="new-play-name"
                className="mt-1"
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Architecture Deep Dive"
              />
            </div>
            <div>
              <Label htmlFor="new-play-stage">Typical stage</Label>
              <Select
                value={createForm.typicalStage}
                onValueChange={(value) =>
                  setCreateForm((current) => ({
                    ...current,
                    typicalStage: String(value),
                  }))
                }
              >
                <SelectTrigger id="new-play-stage" className="mt-1 w-full">
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
            <div>
              <Label htmlFor="new-play-purpose">Purpose</Label>
              <Textarea
                id="new-play-purpose"
                className="mt-1"
                rows={4}
                value={createForm.purpose}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    purpose: event.target.value,
                  }))
                }
                placeholder="When should an SE run this play, and what is it for?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                pending || !createForm.name.trim() || !createForm.purpose.trim()
              }
              onClick={() =>
                run(
                  () => createPlayAction(createForm),
                  "Play created. Add prerequisites to make it runnable.",
                  (id) => {
                    setCreateOpen(false)
                    setCreateForm({
                      name: "",
                      typicalStage: "Evaluate",
                      purpose: "",
                    })
                    if (id) {
                      setUserSelectedId(id)
                      router.replace(`/config?play=${id}`)
                    }
                  }
                )
              }
            >
              Create play
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ReasonEditor({
  reason,
  pending,
  onSave,
  onRetire,
}: {
  reason: ExceptionReasonDto
  pending: boolean
  onSave: (input: { label: string; description: string }) => void
  onRetire: () => void
}) {
  const [label, setLabel] = useState(reason.label)
  const [description, setDescription] = useState(reason.description)
  const dirty = label !== reason.label || description !== reason.description

  return (
    <div className="space-y-2 rounded-lg border border-border/70 bg-background/70 px-3 py-2">
      <Input
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        aria-label="Reason label"
      />
      <Textarea
        rows={2}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        aria-label="Reason description"
      />
      <div className="flex justify-end gap-1">
        {dirty ? (
          <Button
            size="xs"
            disabled={pending}
            onClick={() => onSave({ label, description })}
          >
            Save
          </Button>
        ) : null}
        <Button size="xs" variant="ghost" disabled={pending} onClick={onRetire}>
          Retire
        </Button>
      </div>
    </div>
  )
}
