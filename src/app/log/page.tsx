import { LogView } from "@/components/log-view"
import { getDb } from "@/lib/db"
import { listPlays, listReasons } from "@/lib/playbook/repo"

export const dynamic = "force-dynamic"

export default async function LogPage() {
  const db = await getDb()
  const [plays, reasons] = await Promise.all([listPlays(db), listReasons(db)])
  return <LogView plays={plays} reasons={reasons} />
}
