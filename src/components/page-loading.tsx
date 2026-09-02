import { PageIntro } from "@/components/page-intro"
import { Card, CardContent } from "@/components/ui/card"

export function PageLoading({
  kicker,
  title,
}: {
  kicker: string
  title: string
}) {
  return (
    <div>
      <PageIntro kicker={kicker} title={title}>
        Loading the current playbook…
      </PageIntro>
      <div className="grid gap-3">
        <Card>
          <CardContent className="space-y-3 py-6">
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-24 animate-pulse rounded-xl bg-muted/70" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="h-40 animate-pulse bg-muted/40" />
        </Card>
      </div>
    </div>
  )
}
