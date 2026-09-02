export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const records = parseCsvRecords(text)
  const headerRow = records[0]
  if (!headerRow || headerRow.length === 0) {
    throw new Error("CSV is empty.")
  }
  const headers = headerRow.map((item) => item.trim().toLowerCase())
  const rows = records.slice(1).filter((record) => record.some((cell) => cell.trim() !== ""))
  return {
    headers,
    rows: rows.map((record) => {
      const row: Record<string, string> = {}
      headers.forEach((header, index) => {
        row[header] = (record[index] ?? "").trim()
      })
      return row
    }),
  }
}

function parseCsvRecords(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false
  const input = text.replace(/^\uFEFF/, "")

  for (let i = 0; i < input.length; i++) {
    const char = input[i]!
    const next = input[i + 1]
    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"'
        i += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        cell += char
      }
      continue
    }
    if (char === '"') {
      inQuotes = true
      continue
    }
    if (char === ",") {
      row.push(cell)
      cell = ""
      continue
    }
    if (char === "\n") {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
      continue
    }
    if (char === "\r") continue
    cell += char
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

export function toCsv(headers: string[], rows: Array<Record<string, string | number | boolean | null | undefined>>) {
  const escape = (value: string) => {
    if (/[",\n\r]/.test(value)) return `"${value.replaceAll('"', '""')}"`
    return value
  }
  const lines = [headers.join(",")]
  for (const row of rows) {
    lines.push(
      headers
        .map((header) => escape(row[header] == null ? "" : String(row[header])))
        .join(",")
    )
  }
  return `${lines.join("\n")}\n`
}
