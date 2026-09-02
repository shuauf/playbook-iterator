import type { LibSQLDatabase } from "drizzle-orm/libsql"

import type { schema } from "@/lib/db/schema"

export type PlaybookDb = LibSQLDatabase<typeof schema>
