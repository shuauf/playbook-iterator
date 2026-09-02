import { Suspense } from "react"

import { ConfigView } from "@/components/config-view"
import { getDb } from "@/lib/db"
import { listPlays, listReasons } from "@/lib/playbook/repo"

export const dynamic = "force-dynamic"

export default async function ConfigPage() {
  const db = await getDb()
  const [plays, reasons] = await Promise.all([listPlays(db), listReasons(db)])

  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading playbook…</div>}>
      <ConfigView plays={plays} reasons={reasons} />
    </Suspense>
  )
}
