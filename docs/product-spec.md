# Product specification

Playbook Exception Tracker is a living playbook for a Sales Engineering org. Define the current standard, log the play that actually ran, require an exception reason when a prerequisite is unmet, attach later opportunity outcomes, and review which rules still earn their keep.

Thesis: playbooks are evolving hypotheses. Exceptions are not automatic mistakes. Unexamined exceptions are the problem.

## Workflow

1. **Config** — create and retire sales plays; add, edit, reorder, and retire required or recommended prerequisites. Editing a prerequisite writes a new version. Existing play runs keep the original wording.
2. **Log** — create opportunities, record a play run against the current prerequisites, block submit when an unmet item has no exception reason, resolve advancement and close on the Outcomes queue, and import CSV (preview first, commit all-or-nothing).
3. **Results** — four comparison findings with both sample sizes, confidence badges, a Playbook Review Queue with inspectable underlying records, and stage-grouped descriptive views. Later-stage plays are not ranked as faster or more successful.

## Analysis rules

- Never pool across plays. One row per opportunity per play (latest run) for outcome comparisons.
- Open opportunities are excluded from win rate.
- Lost opportunities are included in win rate and excluded from won-cycle time.
- Cycle time does not feed Enforce or Retire labels.
- Play comparisons are grouped by typical stage.

## Review labels

Enforce more strictly, Consider retiring, Reclassify, Investigate, Insufficient data.

Each card must explain what was observed, why the label was applied, how much data supports it, what limitation remains, and which play runs produced the finding.

## Out of scope until the deterministic loop is demo-ready

AI features. Any AI output must cite existing findings, must not calculate its own metrics, and must be optional.
