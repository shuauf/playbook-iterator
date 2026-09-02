import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { FindingLabel } from "@/data/sample"
import type { PrerequisiteIntent } from "@/lib/playbook/types"

const findingStyles: Record<
  FindingLabel,
  { className: string; label: string }
> = {
  enforce: {
    label: "Enforce more strictly",
    className:
      "border-transparent bg-[oklch(0.93_0.04_25)] text-[oklch(0.42_0.14_25)]",
  },
  retire: {
    label: "Consider retiring",
    className:
      "border-transparent bg-[oklch(0.93_0.03_250)] text-[oklch(0.38_0.08_250)]",
  },
  reclassify: {
    label: "Reclassify",
    className:
      "border-transparent bg-[oklch(0.94_0.04_310)] text-[oklch(0.4_0.12_310)]",
  },
  investigate: {
    label: "Investigate",
    className:
      "border-transparent bg-[oklch(0.95_0.05_75)] text-[oklch(0.45_0.12_55)]",
  },
  insufficient: {
    label: "Insufficient data",
    className:
      "border-transparent bg-muted text-muted-foreground",
  },
}

export function FindingBadge({
  label,
  className,
}: {
  label: FindingLabel
  className?: string
}) {
  const style = findingStyles[label]
  return (
    <Badge className={cn(style.className, className)}>{style.label}</Badge>
  )
}

export function IntentBadge({ intent }: { intent: PrerequisiteIntent }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-md font-medium",
        intent === "required"
          ? "border-[oklch(0.75_0.06_175)] bg-[oklch(0.96_0.02_175)] text-[oklch(0.32_0.06_175)]"
          : "border-border bg-background text-muted-foreground"
      )}
    >
      {intent === "required" ? "Required" : "Recommended"}
    </Badge>
  )
}
