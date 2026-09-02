# Implementation plan

## Done

Phases 1–10 of the original slice: clickable shell, persistent Config, logging with required exceptions, prerequisite versioning, outcomes, CSV import, comparison findings, confidence badges, review queue, and stage-safe secondary reporting.

## This slice

- Inspectable evidence on every review card (opportunity, met/unmet, reason).
- Auto-load the planted interview dataset when the database has no play runs, so a fresh local or Vercel boot is demo-ready.
- Loading, error, and empty states; drop leftover “sample / local SQLite” chrome.
- Product spec, this plan, and a short decision log.

## Durable demo

SQLite under `data/` locally. On Vercel, set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. The app uses the libSQL HTTP client (`@libsql/client/web`) so serverless does not open a file under `/var/task`. `libsql://` URLs are converted to `https://`.

If those variables are missing, SQLite falls back to `/tmp` and reseeds on a cold instance.

## Next (not this slice)

Phase 11: a Playbook Review Summary generated only from `analyze()` output, with an off switch.

Further Phase 12 polish if needed: screenshot the five-minute demo path after Turso is attached in the Vercel project.
