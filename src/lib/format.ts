export function pct(value: number, digits = 0) {
  return `${(value * 100).toFixed(digits)}%`
}

export function pp(value: number, digits = 0) {
  const points = value * 100
  const sign = points > 0 ? "+" : ""
  return `${sign}${points.toFixed(digits)} pp`
}

export function formatCount(n: number) {
  return n.toLocaleString("en-US")
}

export function formatDays(days: number | null) {
  if (days === null || Number.isNaN(days)) return "—"
  const rounded = Math.round(days)
  return `${rounded} day${rounded === 1 ? "" : "s"}`
}
