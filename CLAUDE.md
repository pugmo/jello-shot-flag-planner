# CLAUDE.md

Guidance for working in this repo.

## What this is

A **general-purpose jelly shot layout planner** — a small web app for designing
any party layout where each cell is one jelly shot, then getting an automatic
prep + shopping list. The user paints a grid in any shape with any colors, and
the app totals the shots per color and computes the gelatin boxes, spirit, and
water needed.

It started as a 4th-of-July flag planner, but the goal now is a **reusable tool
for any occasion** (birthdays, team colors, holidays, logos, etc.). A US flag
happens to be the default starting layout so the page is never blank — treat it
as one example, not the focus. When adding features, keep them
**theme-agnostic**; don't hard-code July-4th / flag-specific assumptions into
shared code paths.

## Stack & deployment

- **Static site, no build step.** Plain HTML + CSS + vanilla JS. No framework,
  no bundler, no dependencies.
- Runs by opening `index.html`, or any static server (`npx serve .`).
- Deployed via **GitHub Pages** from `main` (root). Keep it build-free so Pages
  serves the files directly.
- Target is the browser; no Node runtime in production (Node is only used here
  for quick `node --check` and ad-hoc math sanity checks).

## Files

- `index.html` — markup and the three-column layout (controls · grid · prep/liquor).
- `styles.css` — all styling; dark theme via CSS variables at the top.
- `app.js` — all logic. Single `state` object; functions rebuild DOM from it.
- `README.md` — user-facing description.

## Architecture notes (app.js)

- **`state`** holds everything: grid size, `shape`, `target`, `palette`,
  `cells` (flat array of hex color strings or `null`), `active` (per-cell shape
  mask), `strength`, `yieldPerBox`.
- **Cells store hex colors directly** (not palette indices), so the palette can
  be arbitrary and colors can be added/removed/renamed freely.
- **Shapes** are per-cell masks in `insideShape()` (rectangle, circle, star,
  heart, triangle, diamond). `recomputeActive()` marks cells in/out; out-of-shape
  cells are cleared and excluded from all counts.
- **`updateTally()`** counts used colors → renders the prep list → calls
  **`updateLiquor()`**.
- **`updateLiquor()`** is the ingredient calculator. Baseline recipe constants
  (`SHOT_OZ`, `CUP_OZ`, etc.) model: 1 cup boiling water fixed per box, the
  second cup split between spirit and cold water; warns when spirit leaves no
  room to set. Each color = its own flavor/box.
- **`generateFlag()`** paints the default flag into the current grid. It's just
  one preset; it does not auto-resize. Keep presets optional and isolated.

## Conventions

- Match the existing vanilla style: small focused functions, `state` as the
  single source of truth, rebuild-from-state rather than fine-grained DOM diffing.
- No new runtime dependencies or build tooling without a good reason — the
  build-free static deploy is a feature.
- Keep copy and defaults **generic/occasion-neutral**; the flag is an example.
- Quick checks: `node --check app.js` for syntax; one-off `node -e` scripts are
  fine for verifying layout/recipe math.
