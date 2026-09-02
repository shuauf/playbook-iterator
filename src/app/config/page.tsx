import { Suspense } from "react"

import { ConfigView } from "@/components/config-view"

export default function ConfigPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading playbook…</div>}>
      <ConfigView />
    </Suspense>
  )
}
