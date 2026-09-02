"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { loadSyntheticDatasetAction } from "@/lib/ops/actions"

export function LoadDemoButton({
  children = "Load interview dataset",
}: {
  children?: React.ReactNode
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await loadSyntheticDatasetAction()
            if (!result.ok) setError(result.error)
          })
        }
      >
        {pending ? "Loading demo…" : children}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
