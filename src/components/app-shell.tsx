"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, ClipboardPen, Scale } from "lucide-react"

import { cn } from "@/lib/utils"
import { workspace } from "@/data/sample"

const tabs = [
  {
    href: "/config",
    label: "Config",
    hint: "Define the standard",
    icon: BookOpen,
  },
  {
    href: "/log",
    label: "Log",
    hint: "Record a run",
    icon: ClipboardPen,
  },
  {
    href: "/results",
    label: "Results",
    hint: "Decide what to change",
    icon: Scale,
  },
] as const

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-[oklch(0.965_0.012_85)]/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-4 md:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-medium tracking-[0.18em] text-[oklch(0.42_0.06_175)] uppercase">
                {workspace.team} · Sample workspace
              </p>
              <Link href="/config" className="font-heading text-[1.65rem] leading-none text-foreground">
                Playbook Exception Tracker
              </Link>
              <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
                {workspace.subtitle}
              </p>
            </div>
            <div className="flex items-center gap-2 self-start rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-[oklch(0.55_0.12_145)]" />
              Phase 1 shell · nothing is saved yet
            </div>
          </div>

          <nav aria-label="Primary" className="grid gap-2 sm:grid-cols-3">
            {tabs.map((tab, index) => {
              const active = pathname === tab.href
              const Icon = tab.icon
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors",
                    active
                      ? "border-[oklch(0.75_0.05_175)] bg-card shadow-[0_1px_0_rgba(28,25,23,0.04)]"
                      : "border-transparent bg-card/50 hover:border-border hover:bg-card"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border text-xs font-medium",
                      active
                        ? "border-[oklch(0.7_0.06_175)] bg-[oklch(0.95_0.03_175)] text-[oklch(0.32_0.06_175)]"
                        : "border-border bg-background text-muted-foreground"
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <Icon className="size-3.5 opacity-70" />
                      {tab.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {tab.hint}
                    </span>
                  </span>
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>

      <footer className="border-t border-border/80">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-1 px-4 py-4 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between md:px-8">
          <p>
            Exceptions are decisions, not automatic mistakes. The playbook is a
            set of hypotheses.
          </p>
          <p>Northstar SE · synthetic sample data</p>
        </div>
      </footer>
    </div>
  )
}
