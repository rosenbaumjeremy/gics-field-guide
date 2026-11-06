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

Use web search and fetch. Aim for **10–18 sources per brief** (the fundamentals need structural
sources too: industry datasets, market-size estimates, annual reports and 10-K business and risk
sections), as current as possible (the last
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
  "basics": {
    "intro": "What these companies do and how they make money, in plain words.",
    "products": [
      {"name": "Memory", "what": "Chips that store data: DRAM for working memory, NAND flash for storage.", "examples": "Micron DRAM, HBM and NAND"}
    ],
    "terms": [
      {"term": "Fabless", "meaning": "A chip company that designs chips but pays a foundry to make them."}
    ],
    "drivers": [
      {"name": "Inventory cycle", "how": "Customers over-order in shortages and stop ordering while they work stock down, so revenue swings more than end demand."}
    ]
  },
  "fundamentals": {
    "business": ["answer to question 1", "answer to question 2", "... 6 answers"],
    "overview": ["... 5 answers"],
    "competition": ["... 7 answers"],
    "drivers": ["... 6 answers"],
    "financials": ["... 7 answers"],
    "risks": ["... 7 answers"],
    "horizon": {
      "opportunities": ["One sentence [3]", "..."],
      "threats": ["One sentence [7]", "..."],
      "assessment": "Forward-looking view of the next 3 to 5 years."
    }
  },
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
- `basics`: the very basics, for a reader new to the industry. Write it before the analysis and
  keep it timeless: it explains how the business works, not this quarter's numbers.
  - `intro`: 30–120 words. What the companies do, who their customers are and how they make money.
    Say what GICS puts here that a reader might not expect, and what sits in a neighbouring
    sub-industry instead.
  - `products`: 3–8 product sets or business lines. `name`, `what` (one or two sentences: what it
    is and what it's used for) and `examples` (real products or companies, plain text).
  - `terms`: 8–16 key terms an analyst in this industry uses (business models, metrics, technical
    words), each with a plain-English `meaning` of one or two sentences. Say why the term matters
    where it isn't obvious.
  - `drivers`: 4–8 things that move revenue, margins or the share price. `name`, and `how`: the
    mechanism (what changes, and how it shows up in the numbers).
  - Each `what`, `meaning` and `how` is at most 70 words. Citations are optional here, but any
    figure still needs one, so prefer no figures.
- `fundamentals`: the six-part industry fundamentals analysis. Each part is a list of answers,
  **one per question below, in exactly this order** (the site prints the questions; you write
  only the answers). Each answer is 15–110 words: answer the question directly and specifically
  for this sub-industry, naming companies and giving cited figures where they help. If the honest
  answer is "barely" (e.g. demographics hardly matter), say so and why in a sentence or two. The
  whole block is 1,200–3,400 words. It describes how the industry works over a full cycle; keep
  this quarter's news for the eight-part market view, and don't just repeat it.
  1. `business` — Understand the business model (6): primary revenue streams; who the customers
     are; principal costs; what determines pricing power; major assets and liabilities;
     capital-intensive or asset-light.
  2. `overview` — Industry overview (5): market size and growth; main segments; where it sits in
     the value chain (suppliers and customers); how the industry has evolved; where sales and
     production are concentrated geographically.
  3. `competition` — Industry structure and competition (7): how many significant competitors;
     the market leaders (with shares where sourced); consolidated or fragmented; barriers to
     entry; economies of scale; commoditized or differentiated; who has bargaining power,
     customers or suppliers.
  4. `drivers` — Economic drivers (6): what drives revenue growth; what determines operating
     margins; key cost variables; sensitivity to interest rates; sensitivity to inflation,
     unemployment, GDP and commodity prices; cyclical, defensive or secular growth.
  5. `financials` — Financial characteristics of a typical company (7): revenue and earnings
     growth; gross and operating margins; ROE and ROIC; debt and leverage; free cash flow
     generation; capital expenditure requirements; valuation multiples. Use industry datasets
     (Damodaran's margins, ROE/ROIC, debt, capex and multiples tables are ideal) plus bellwether
     filings, and say which you are quoting. At least 4 of the 7 answers must cite a source.
  6. `risks` — Risks and future developments (7): regulatory and legislative changes;
     technological disruption and AI; demographic changes; changing consumer behavior; new
     competitors and business models; geopolitical and supply-chain risks; potential substitutes.
  - `horizon`: the next 3 to 5 years. `opportunities` and `threats` are 2–5 one-sentence items
    each (the biggest, not every one); `assessment` is 50–180 words weighing them up.
  Every part must cite at least one source.
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
python scripts/publish.py
```

Use exactly this command; don't run `git add`, `git commit` or `git push` yourself (a hand-written
git command can stop the run on a permission prompt). The script re-runs the checker, commits
`site/data/writeups`, pushes to `main` (rebasing and retrying if `main` moved) and, if `main`
refuses, pushes to `claude/briefs-<date>`. If it prints `PUSHED TO BRANCH`, say so in the final
message.

## Step 6: finish

End with one line per brief: `<name> — https://<site>/#c-<code>` (use the site address from the
README if one is listed there, otherwise just the code), then `<k> of 163 published.`
