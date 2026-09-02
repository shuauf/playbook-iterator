# Playbook Exception Tracker

A living playbook for Sales Engineering teams. Define the current standard, record deliberate exceptions when a play is run, attach later opportunity outcomes, and review which rules to enforce, relax, reclassify, or leave alone.

## Current slice

**Config is live.** Plays, prerequisites, and exception reasons persist in a local SQLite file at `data/playbook.sqlite`. The workspace starts with one seeded play — Product Demo — and three prerequisites.

Log reads the current playbook so a Config change shows up on the operating surface. Outcomes, import, and Results are still sample illustrations.

## Product surfaces

1. **Config** — create, edit, and retire sales plays; add, reorder, and retire required or recommended prerequisites; manage the exception-reason list. History is recorded on the play.
2. **Log** — record a run against the current playbook definition. Outcomes queue and CSV import remain sample UI.
3. **Results** — leadership review queue. Still driven by illustrative sample findings.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:45217](http://localhost:45217). The app starts on Config.

```bash
npm test    # playbook persistence tests
npm run lint
```

The SQLite file is created on first load and is gitignored. Delete `data/playbook.sqlite` to re-seed the initial Product Demo.

## Current status

| Phase | Intent | Status |
| --- | --- | --- |
| 1 | Clickable application shell | Done |
| 2 | Persistence and a usable Config | In progress |
| 3 | Independent analysis engine + synthetic fixtures | Not started |
| 4 | Results driven by the engine | Not started |
| 5 | CSV import and demo polish | Not started |
