# 🎆 Jell-O Shot Flag Planner

A little browser tool for planning a **Jell-O shot flag** — paint a grid where each
cell is one shot, auto-generate a US flag layout, and get a per-color prep list so
you know exactly how many red / white / blue shots to make.

Built for making **250 Jell-O shots into a flag for the 4th of July**.

## Features

- **Paintable grid** — click or drag to paint cells. Right-click erases.
- **One-click US flag** — generates stripes + a blue star-field canton, scaled to your grid.
- **Resizable grid** — set columns × rows (default **25 × 10 = 250 shots**).
- **Live prep list** — running count of each color and total, with progress toward your 250 target.
- **Save / load** — stores your layout in the browser.
- **Export PNG** — save a picture of the plan to print or share.

## Run it

It's a static site — no build step.

```bash
# from the project folder, any static server works, e.g.:
npx serve .
# or just open index.html in a browser
```

## Deploy (GitHub Pages)

Push to GitHub, then in the repo: **Settings → Pages → Build from branch → `main` / root**.
Your planner will be live at `https://<user>.github.io/jello-shot-flag-planner/`.

## Tweaking

- Colors live in the `COLORS` array at the top of [`app.js`](app.js).
- The shot target (250) is the `TARGET` constant in [`app.js`](app.js).
- Flag math is in `generateFlag()`.

---

🍮🇺🇸 Happy 4th!
