# 🎆 Jelly Shot Layout Planner

A little browser tool for planning a **jelly shot layout** — paint a grid where each
cell is one shot, auto-generate a US flag layout, and get a per-color prep list so
you know exactly how many red / white / blue shots to make.

Built for making **250 jelly shots into a flag for the 4th of July**.

## Features

- **Paintable grid** — click or drag to paint cells. Right-click erases.
- **Loads a US flag by default** — a clean 13-stripe flag with a solid Bright Blue canton (23 × 13).
- **Resizable grid** — set columns × rows.
- **Any shape** — rectangle, circle, star, heart, triangle, or diamond. Cells outside the shape turn off and aren't counted.
- **Full color picker** — add any colors, rename them (e.g. flavor labels), remove any swatch.
- **Live prep list** — running count of each color and total, with progress toward your target.
- **Liquor & ingredient calculator** — a strength slider sets how strong each jelly shot is vs. a traditional 1.5 oz shot, then totals the boxes, vodka (in oz / cups / bottles), and water you'll need based on what you've painted. Each color is treated as its own flavor/box.
- **Export PNG** — save a picture of the plan to print or share.

### Strength model

Baseline is the [Bread Booze Bacon vodka jelly shot recipe](https://breadboozebacon.com/vodka-jello-shots/):
1 box (3 oz) + 1 cup boiling water + ½ cup cold water + ½ cup vodka → ~10 shots.
Boiling water is fixed at 1 cup/box; the remaining cup is split between vodka and cold
water. Standard ≈ 4 jelly shots per regular shot; the strong end (~1 cup vodka, no cold
water) ≈ 2 per regular shot. Past that there's no water left to set, and the tool warns you.

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
