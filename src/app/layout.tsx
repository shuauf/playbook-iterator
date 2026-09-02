import type { Metadata } from "next"
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google"

import { AppShell } from "@/components/app-shell"
import { TooltipProvider } from "@/components/ui/tooltip"

import "./globals.css"

function persistenceCaption() {
  if (process.env.TURSO_DATABASE_URL || process.env.PLAYBOOK_DB_URL || process.env.LIBSQL_URL) {
    return "Shared database"
  }
  if (process.env.VERCEL) return "Demo dataset on this instance"
  return "Local SQLite"
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
})

export const metadata: Metadata = {
  title: "Playbook Exception Tracker",
  description:
    "Define SE sales plays, record deliberate exceptions, and review which playbook rules still earn their keep.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          <AppShell storageLabel={persistenceCaption()}>{children}</AppShell>
        </TooltipProvider>
      </body>
    </html>
  )
}
