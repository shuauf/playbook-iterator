"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-[11px] font-medium tracking-[0.16em] text-[oklch(0.42_0.06_175)] uppercase">
          Error
        </p>
        <h1 className="font-heading mt-2 text-3xl">This page couldn’t load</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          A server error occurred. Try again. If this keeps happening on Vercel, set
          TURSO_DATABASE_URL so the database is not written under a read-only path.
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs text-muted-foreground">Reference {error.digest}</p>
        ) : null}
        <Button className="mt-6" onClick={() => retry()}>
          Try again
        </Button>
      </CardContent>
    </Card>
  )
}
