# Decision log

## 2026-09-02 — Review evidence is the records, not a count

Leadership cards already had observation, why, sample size, and limitation. “Which records produced this?” was only a count. The queue now lists the underlying play runs (opportunity, status, met/unmet, exception reason), unmet first, so a recommendation can be inspected without leaving Results.

## 2026-09-02 — Seed the planted corpus on empty databases

The default seed was one play and four open opportunities. Results and the review queue stay empty until someone finds Log → Import. Phase 12 wants a polished demo. `bootstrapPlaybook` still seeds the thin catalog, then loads the planted interview dataset when there are no play runs. Reloads do not duplicate that data. `seedIfEmpty` is unchanged for unit tests that need a blank Config.

## 2026-09-02 — Vercel filesystem vs durable storage

Vercel functions cannot `mkdir` under `/var/task`. Local SQLite goes to `/tmp` there so the app boots; that file is per-instance. Shared durability is a Turso/libSQL URL, not a bundled SQLite file. The demo dataset is reseeded on empty instances so a preview deploy is usable without Turso.

## 2026-09-02 — AI stays off

The deterministic loop, evidence list, and demo seed come before any generated summary. AI must not compute its own metrics.
