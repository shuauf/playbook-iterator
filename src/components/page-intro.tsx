import { cn } from "@/lib/utils"

export function PageIntro({
  kicker,
  title,
  children,
  className,
}: {
  kicker: string
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-6 max-w-3xl", className)}>
      <p className="text-[11px] font-medium tracking-[0.16em] text-[oklch(0.42_0.06_175)] uppercase">
        {kicker}
      </p>
      <h1 className="font-heading mt-1 text-3xl leading-tight text-foreground md:text-[2.15rem]">
        {title}
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
        {children}
      </p>
    </div>
  )
}
