# GICS Field Guide

A guided tour of the Global Industry Classification Standard: all 11 sectors, 25 industry
groups, 74 industries and 163 sub-industries (structure in effect since the 2023 revision),
each explained in plain language. A static site: `site/` is the finished output, deployed by
Cloudflare Workers Builds on every push to `main` (see `wrangler.jsonc`).

## Editing the content

Everything lives in `site/data/gics.json`, one entry per level, in tour order (each parent
before its children). The level comes from the code length: 2 digits = sector, 4 = industry
group, 6 = industry, 8 = sub-industry.

```json
{ "code": "45103010", "name": "Application Software", "desc": "…", "note": "optional callout" }
```

Sectors also take `drivers` (what moves the sector) and `examples` (well-known companies).
Descriptions are our own summaries, not MSCI's official definitions; check changes against
MSCI's published GICS methodology.

## Sector weights

`site/data/weights.json` holds each sector's share of the S&P 500 over time (shown at
`#weights`, `#weights-45` etc., and as a sparkline on each sector page; drawn by
`site/weights.js` as plain SVG). Each row has a `label`, a `short` axis label, a decimal
year `x`, and `w` keyed by sector code. Year-end 2023–2025 are missing; `gap` marks that
stretch on the chart. When you add rows, keep `sources` up to date and remove or narrow
`gap`. Values come from Bespoke Investment Group (1990–Jul 2023) and a ChartRow SPY-holdings
estimate (Nov 2026).

If you add a new site file, add it to `SHELL` in `site/sw.js` and bump `CACHE`.

## Run locally

```
python -m http.server 8160 --directory site
```

GICS is a trademark of MSCI and Standard & Poor's.
