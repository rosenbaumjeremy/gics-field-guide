# GICS Field Guide: daily research briefs

Each day the routine publishes **three** sub-industry research briefs on the GICS Field Guide.
The site deploys automatically on every push to `main` (Cloudflare Workers Builds). A brief
shows on its sub-industry page (`#c-<code>`) and in the list at `#research`.

You are a senior equity research analyst writing an institutional sector note for an
intelligent, non-specialist reader. Be specific, quantitative and sourced. Never invent a number.

## Step 1: which sub-industries

```
python scripts/next_writeups.py
```

- `DONE <date>`: today's three are already published. **Stop.**
- `FINISHED`: every sub-industry has a brief. Print `All 163 briefs are published.` and **stop.**
- Otherwise it prints `WRITE <code> <name> [<sector> > <group> > <industry>]` lines. Write
  exactly those, in that order. The order comes from `site/data/writeups/queue.json` (sectors by
  S&P 500 weight, largest first); don't change it.

Read each sub-industry's entry in `site/data/gics.json` (its description and any note) so the
brief matches how GICS defines it. Where the sub-industry is the whole of its industry, cover it
as that industry.

## Step 2: research

Use web search and fetch. Aim for **8–15 sources per brief**, as current as possible (the last
3 months for markets, valuations, earnings and flows; the latest annual data for structure).
Prefer primary or well-known sources:

- Company filings, earnings releases and call transcripts of the largest companies in the
  sub-industry; investor-day material.
- S&P Dow Jones Indices and MSCI factsheets; FactSet Earnings Insight; LSEG/Refinitiv and
  Yardeni sector data; Damodaran's industry datasets (NYU Stern) for margins, ROIC and multiples.
- Central banks, BLS/BEA, IMF/OECD, Fed minutes; regulators (SEC, FTC, FDA, FCC, EU Commission…).
- Industry bodies and research firms (e.g. SIA/WSTS for semiconductors, Gartner/IDC for IT
  spending), sector ETF issuer pages (holdings, assets, flows), and reputable financial press.

Rules:

- **Every figure carries a citation `[n]`** to a source you actually opened. If you cannot find a
  figure, say so plainly ("consensus figures for this group weren't publicly available") rather
  than estimating. Your own judgment is welcome but must read as judgment ("we think…", "our
  read…") and rest on cited facts.
- Give dates with time-sensitive numbers ("as of 31 Oct 2026").
- Be careful with sub-industry vs. sector data: say which one a number describes.
- No buy/sell ratings, price targets or advice to the reader. Relative views on valuation and
  expectations are fine ("priced for…", "looks stretched against its 10-year range").

## Step 3: write the brief

Create `site/data/writeups/<code>.json` for each one:

```json
{
  "code": "45301020",
  "added": "<today YYYY-MM-DD, Asia/Jerusalem>",
  "asOf": "<date of the latest market data used>",
  "summary": "Bottom line in 60–110 words with citations [1][4].",
  "metrics": [
    {"label": "Forward P/E (sector)", "value": "31.2x", "context": "10-yr avg 20.5x; as of 31 Oct 2026", "source": 3}
  ],
  "watch": ["Catalyst or risk to watch, one sentence [5]", "..."],
  "bellwethers": ["Nvidia", "Broadcom", "..."],
  "sections": [
    {"id": "macro", "paragraphs": ["...", "..."]},
    {"id": "demand", "paragraphs": ["..."]},
    {"id": "structure", "paragraphs": ["..."]},
    {"id": "environment", "paragraphs": ["..."]},
    {"id": "economics", "paragraphs": ["..."]},
    {"id": "earnings", "paragraphs": ["..."]},
    {"id": "valuation", "paragraphs": ["..."]},
    {"id": "positioning", "paragraphs": ["..."]}
  ],
  "sources": [
    {"n": 1, "title": "...", "publisher": "...", "date": "2026-10-28", "url": "https://..."}
  ]
}
```

- `metrics`: 5–8 key figures (e.g. market size and growth, share of S&P 500, operating margin,
  ROIC, consensus EPS growth, forward P/E vs history, FCF yield, YTD relative performance). Each
  has a `source` number. `context` is optional but helpful.
- `watch`: 3–5 one-sentence catalysts and risks.
- `bellwethers`: 4–8 of the largest or most representative companies, plain names.
- `sources`: numbered 1, 2, 3… in the order first cited. Every source must be cited somewhere.
- `sections`: exactly these eight ids, in this order, each 140–280 words in 1–3 paragraphs, each
  with at least one citation. Cover:
  1. `macro` — Macroeconomic environment and business cycle: where we are in the cycle and how it
     hits this sub-industry; interest-rate path, inflation, monetary and fiscal policy, currency.
  2. `demand` — Industry growth and structural demand: addressable market size and growth,
     secular drivers, demand elasticity/cyclicality, demographics, long-term prospects.
  3. `structure` — Industry structure and competitive positioning: Porter's five forces
     (name them), barriers to entry, concentration and market shares, pricing power, moats.
  4. `environment` — Regulatory, political and technological environment: PESTEL factors,
     government intervention, regulation, technological disruption, emerging risks.
  5. `economics` — Industry economics and financial fundamentals: revenue growth, gross and
     operating margins, capital intensity, operating leverage, ROE, ROIC, free cash flow.
  6. `earnings` — Earnings outlook and forward expectations: earnings growth, consensus
     estimates, revision trends, management guidance, and where our view differs from consensus.
  7. `valuation` — Valuation and relative attractiveness: forward multiples, normalized
     earnings, FCF yield, versus its own history, peers and the market; growth implied by price.
  8. `positioning` — Market positioning, momentum and capital flows: relative strength, ETF and
     institutional flows, short interest, positioning, price momentum, breadth.

Plain text only inside strings: no Markdown, HTML or line breaks. Citations are `[n]` with no
space before them is fine either way. Write as a clear, direct analyst; no filler.

## Step 4: list it and check

Append one entry per brief to the array in `site/data/writeups/index.json`, keeping existing
entries exactly as they are:

```json
{"code": "45301020", "added": "<today>"}
```

Then:

```
python scripts/check_writeups.py
```

It must print `OK`. Fix anything it reports (it checks the format, lengths, and that every
citation matches a source). Change nothing else in the repo.

## Step 5: publish

```
git add site/data/writeups
git -c user.name="GICS Field Guide routine" -c user.email="rosenbaum.jeremy@gmail.com" commit -m "Research briefs <date>: <name 1>, <name 2>, <name 3>"
git push origin main
```

If the push is rejected because `main` moved, `git pull --rebase` and retry (3 tries). If it is
refused for permission, push to `claude/briefs-<date>` instead and say so in the final message.

## Step 6: finish

End with one line per brief: `<name> — https://<site>/#c-<code>` (use the site address from the
README if one is listed there, otherwise just the code), then `<k> of 163 published.`
