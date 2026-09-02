export function newId(prefix?: string) {
  const id = crypto.randomUUID()
  return prefix ? `${prefix}-${id}` : id
}

export function newExternalId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}
