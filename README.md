# Playbook Exception Tracker

A living playbook for a Sales Engineering org. Define the current standard, log the play that actually ran, require an exception reason when a prerequisite is unmet, attach later opportunity outcomes, and review which rules still earn their keep.

Thesis: playbooks are evolving hypotheses. Exceptions are not automatic mistakes. Unexamined exceptions are the problem.

## What this slice does

The operational loop is complete:

1. **Config** — create and retire sales plays; add, edit, reorder, and retire required or recommended prerequisites. Editing a prerequisite writes a **new version**. Existing play runs keep the original wording.
2. **Log** — create opportunities, record a play run against the **current** prerequisites, block submit when an unmet item has no exception reason, resolve advancement and close on the Outcomes queue, and import CSV (preview first, commit all-or-nothing).
3. **Results** — four comparison findings with both sample sizes, confidence badges, a Playbook Review Queue, and stage-grouped descriptive views. Later-stage plays are not ranked as faster or more successful.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:45217](http://localhost:45217).

```bash
npm test
npm run lint
```

SQLite lives at `data/playbook.sqlite` (gitignored). Delete it to re-seed Product Demo and a few open opportunities.

## Interview dataset

On **Log → Import**, use:

- **Preview tiny validation CSV** — one new row, one update, one invalid row, one duplicate id. Nothing is saved until the file is clean.
- **Load interview dataset** — planted patterns used by the analysis tests: a real win-rate gap, a neutral prerequisite, an eight-observation mirage, and a later-stage play that looks better only because it sits later.

## Analysis rules

- Never pool across plays. One row per opportunity per play (latest run) for outcome comparisons.
- Open opportunities are excluded from win rate.
- Lost opportunities are included in win rate and excluded from won-cycle time.
- Cycle time does not feed Enforce or Retire labels.
- Play comparisons are grouped by typical stage.

## Status

| Phase | Intent | Status |
| --- | --- | --- |
| 1 | Clickable application shell | Done |
| 2 | Persistence and a usable Config | Done |
| 3 | Log a play run | Done |
| 4 | Preserve playbook history | Done |
| 5 | Opportunity outcomes | Done |
| 6 | Bulk CSV import | Done |
| 7 | First Results page | Done |
| 8 | Confidence and statistical tests | Done |
| 9 | Playbook Review Queue | Done |
| 10 | Expanded analysis, stage-safe | Done |
