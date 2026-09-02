# Playbook Exception Tracker

A living playbook for Sales Engineering teams. Define the current standard, record deliberate exceptions when a play is run, attach later opportunity outcomes, and review which rules to enforce, relax, reclassify, or leave alone.

This repository is currently a **Phase 1 clickable shell**: Config, Log, and Results with hardcoded Northstar SE sample content. There is no database and no real analysis yet. The goal is to judge whether the product is understandable and visually credible before adding backend complexity.

## Product surfaces

1. **Config** — the living playbook. Active and retired sales plays, prerequisites (required vs recommended), exception reasons, and a history note that makes versioning visible without an admin console.
2. **Log** — the operating surface. Pick an opportunity, choose a play, check prerequisites, and expand an exception reason when something is unmet. Also includes an outcomes queue and a CSV import preview that refuses partial loads.
3. **Results** — leadership review. A playbook review queue first (enforce, retire, reclassify, investigate, insufficient data), then descriptive evidence. Findings link back to the play in Config.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:45217](http://localhost:45217). The app starts on Config.

## Current status

| Phase | Intent | Status |
| --- | --- | --- |
| 1 | Clickable application shell | In progress |
| 2 | Persistence, versioned playbook, real logging | Not started |
| 3 | Independent analysis engine + synthetic fixtures | Not started |
| 4 | Results driven by the engine | Not started |
| 5 | CSV import and demo polish | Not started |

Sample interactions in this shell stay in the browser session and reset on refresh.
