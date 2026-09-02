import os from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import {
  defaultDbPath,
  ensureWritableSqlitePath,
  isReadOnlyDeployFs,
  openPlaybookConnection,
  resolveDbConnection,
  toRemoteLibsqlUrl,
} from "@/lib/db"

const KEYS = [
  "PLAYBOOK_DB_PATH",
  "PLAYBOOK_DB_URL",
  "PLAYBOOK_DB_AUTH_TOKEN",
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "LIBSQL_URL",
  "LIBSQL_AUTH_TOKEN",
  "VERCEL",
  "AWS_LAMBDA_FUNCTION_NAME",
  "NETLIFY",
  "LAMBDA_TASK_ROOT",
] as const

describe("database location", () => {
  const previous = new Map<string, string | undefined>()

  afterEach(() => {
    for (const key of KEYS) {
      const value = previous.get(key)
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    previous.clear()
  })

  function setEnv(key: (typeof KEYS)[number], value: string | undefined) {
    if (!previous.has(key)) previous.set(key, process.env[key])
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }

  function clearDeployAndDbEnv() {
    for (const key of KEYS) setEnv(key, undefined)
  }

  it("uses data/playbook.sqlite locally", () => {
    clearDeployAndDbEnv()
    expect(isReadOnlyDeployFs()).toBe(false)
    expect(defaultDbPath()).toBe(path.join(process.cwd(), "data", "playbook.sqlite"))
    expect(resolveDbConnection()).toEqual({
      kind: "file",
      path: path.join(process.cwd(), "data", "playbook.sqlite"),
    })
  })

  it("uses the os temp dir on Vercel so mkdir does not target /var/task", () => {
    clearDeployAndDbEnv()
    setEnv("VERCEL", "1")
    expect(isReadOnlyDeployFs()).toBe(true)
    expect(defaultDbPath()).toBe(path.join(os.tmpdir(), "playbook.sqlite"))
    expect(resolveDbConnection()).toEqual({
      kind: "file",
      path: path.join(os.tmpdir(), "playbook.sqlite"),
    })
  })

  it("lets PLAYBOOK_DB_PATH override the default", () => {
    clearDeployAndDbEnv()
    setEnv("VERCEL", "1")
    setEnv("PLAYBOOK_DB_PATH", "/custom/playbook.sqlite")
    expect(defaultDbPath()).toBe("/custom/playbook.sqlite")
  })

  it("prefers a Turso URL over a local file", () => {
    clearDeployAndDbEnv()
    setEnv("VERCEL", "1")
    setEnv("TURSO_DATABASE_URL", "libsql://playbook.turso.io")
    setEnv("TURSO_AUTH_TOKEN", "secret-token")
    expect(resolveDbConnection()).toEqual({
      kind: "remote",
      url: "libsql://playbook.turso.io",
      authToken: "secret-token",
    })
  })

  it("requires an auth token for a remote Turso URL", async () => {
    await expect(
      openPlaybookConnection({ kind: "remote", url: "libsql://playbook.turso.io" })
    ).rejects.toThrow(/TURSO_AUTH_TOKEN/)
  })

  it("converts libsql URLs to https for the Vercel HTTP client", () => {
    expect(toRemoteLibsqlUrl("libsql://playbook-user.turso.io")).toBe(
      "https://playbook-user.turso.io"
    )
    expect(toRemoteLibsqlUrl("https://playbook-user.turso.io")).toBe(
      "https://playbook-user.turso.io"
    )
  })

  it("falls back to the os temp dir when the sqlite parent cannot be created", async () => {
    const { mkdtemp, writeFile, rm } = await import("node:fs/promises")
    const dir = await mkdtemp(path.join(os.tmpdir(), "db-readonly-"))
    const blocker = path.join(dir, "not-a-directory")
    await writeFile(blocker, "x")
    try {
      const result = ensureWritableSqlitePath(path.join(blocker, "playbook.sqlite"))
      expect(result).toBe(path.join(os.tmpdir(), "playbook.sqlite"))
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
