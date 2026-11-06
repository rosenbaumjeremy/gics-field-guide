"use strict";
// Sub-industry research briefs (data/writeups/): a list in index.json, one <code>.json per
// brief, and queue.json with the order the daily routine writes them in. A brief appears on
// its sub-industry page; #research lists them all.
let WI = [], WQ = null;
const BRIEFS = {};
const FRAMEWORK = {
  macro: "Macroeconomic environment and business cycle",
  demand: "Industry growth and structural demand",
  structure: "Industry structure and competitive positioning",
  environment: "Regulatory, political and technological environment",
  economics: "Industry economics and financial fundamentals",
  earnings: "Earnings outlook and forward expectations",
  valuation: "Valuation and relative attractiveness",
  positioning: "Market positioning, momentum and capital flows"
};
// The six-part fundamentals analysis: each part answers a fixed list of questions, in order
const FUNDAMENTALS = [
  ["business", "Understand the business model", "How the companies actually generate revenue and earnings.", ["What are their primary revenue streams?", "Who are their customers?", "What are their principal costs?", "What determines pricing power?", "What are their major assets and liabilities?", "Is the business capital-intensive or asset-light?"]],
  ["overview", "Industry overview", "How big the industry is, how it is divided and how it got here.", ["How big is the market and how fast is it growing?", "What are the main segments?", "Where does it sit in the value chain?", "How has the industry evolved?", "Where are sales and production concentrated geographically?"]],
  ["competition", "Industry structure and competition", "The competitive landscape.", ["How many significant competitors exist?", "Who are the market leaders?", "Is the industry consolidated or fragmented?", "What are the barriers to entry?", "Are there economies of scale?", "Are products commoditized or differentiated?", "Who has bargaining power, customers or suppliers?"]],
  ["drivers", "The economic drivers", "What actually drives financial performance.", ["What drives revenue growth?", "What determines operating margins?", "What are the key cost variables?", "How sensitive is the industry to interest rates?", "How sensitive is it to inflation, unemployment, GDP and commodity prices?", "Is the industry cyclical, defensive or secular-growth oriented?"]],
  ["financials", "Financial characteristics", "What a typical company in the sub-industry looks like financially.", ["Revenue and earnings growth", "Gross and operating margins", "Return on equity (ROE) and return on invested capital (ROIC)", "Debt and leverage", "Free cash flow generation", "Capital expenditure requirements", "Valuation multiples"]],
  ["risks", "Risks and future developments", "What could fundamentally change the industry.", ["Regulatory and legislative changes", "Technological disruption and AI", "Demographic changes", "Changing consumer behavior", "New competitors and business models", "Geopolitical and supply-chain risks", "Potential substitutes"]]
];
const hasBrief = code => WI.some(e => e.code === code);
const fmtDate = d => new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function queueInfo(code) {
  if (!WQ) return null;
  const done = new Set(WI.map(e => e.code));
  const left = WQ.queue.filter(c => !done.has(c));
  const pos = left.indexOf(code);
  if (pos < 0) return null;
  const days = Math.floor(pos / WQ.perDay);
  const eta = new Date(Date.now() + days * 864e5);
  return { pos: pos + 1, eta: days === 0 ? "the next daily run" : "around " + eta.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) };
}

// "text [2] more [3]" -> text nodes and small citation buttons that scroll to the source
function cited(text, root) {
  const out = [];
  text.split(/(\[\d+\])/).forEach(part => {
    const m = part.match(/^\[(\d+)\]$/);
    if (!m) { if (part) out.push(part); return; }
    out.push(el("button", { type: "button", class: "cite", "aria-label": "Source " + m[1], onclick: () => {
      const src = root.querySelector(`#src-${m[1]}`);
      if (!src) return;
      const box = src.closest("details"); if (box) box.open = true;
      src.scrollIntoView({ behavior: "smooth", block: "center" });
      src.classList.add("flash"); setTimeout(() => src.classList.remove("flash"), 1600);
    } }, m[1]));
  });
  return out;
}

function briefSection(code) {
  const box = el("section", { class: "brief", "aria-label": "Research brief" });
  if (!hasBrief(code)) {
    const q = queueInfo(code);
    box.classList.add("pending");
    box.append(el("div", { class: "eyebrow" }, "Research brief"),
      el("p", {}, q ? `Not written yet. It is number ${q.pos} in the queue, so expect it ${q.eta}. Three briefs are added each day, starting with the sectors that make up most of the S&P 500.` : "Not written yet."),
      el("button", { type: "button", class: "linkbtn", onclick: () => (location.hash = "research") }, "See the briefs published so far →"));
    return box;
  }
  box.append(el("p", { class: "muted" }, "Loading the research brief…"));
  const fill = b => { box.replaceChildren(...briefBody(b, box)); };
  if (BRIEFS[code]) fill(BRIEFS[code]);
  else fetch(`data/writeups/${code}.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(b => { BRIEFS[code] = b; fill(b); })
    .catch(() => box.replaceChildren(el("p", { class: "muted" }, "The research brief didn't load. Check your connection and reload the page.")));
  return box;
}

// A top-level collapsible part of a brief; only the bottom line starts open
function group(title, open, cls, ...kids) {
  const d = el("details", { class: "grp" + (cls ? " " + cls : "") }, el("summary", {}, el("h3", { class: "fwtitle" }, title)), el("div", { class: "grpbody" }, ...kids));
  d.open = open;
  return d;
}

// "Open all" button for a list of nested parts
function openAll(items, noun) {
  const b = el("button", { type: "button", class: "linkbtn", onclick: () => {
    const open = !items.every(d => d.open); items.forEach(d => (d.open = open)); b.textContent = (open ? "Close all " : "Open all ") + noun;
  } }, "Open all " + noun);
  return b;
}

function briefBody(b, root) {
  const parts = [];
  parts.push(el("div", { class: "brief-head" },
    el("div", {}, el("div", { class: "eyebrow" }, "Research brief"), el("h2", {}, "Sector research: eight-part framework")),
    el("span", { class: "asof" }, "Data as of " + fmtDate(b.asOf))));
  parts.push(group("Bottom line", true, "bottomline", el("p", {}, ...cited(b.summary, root))));
  if (b.basics) parts.push(basicsBlock(b.basics, root));
  parts.push(group("What to watch", false, "",
    el("ul", { class: "watch" }, ...b.watch.map(x => el("li", {}, ...cited(x, root)))),
    el("h4", { class: "gap-top grph" }, "Bellwethers"), el("div", { class: "chips" }, ...b.bellwethers.map(x => el("span", { class: "chip" }, x)))));
  if (b.fundamentals) parts.push(fundamentalsBlock(b.fundamentals, root));
  const secs = b.sections.map((s, i) => el("details", { class: "fw" },
    el("summary", {}, el("span", { class: "fwn" }, String(i + 1)), el("span", {}, FRAMEWORK[s.id] || s.id)),
    el("div", { class: "fwbody" }, ...s.paragraphs.map(p => el("p", {}, ...cited(p, root))))));
  parts.push(group("Market view: eight-part analysis", false, "",
    el("div", { class: "grptools" }, openAll(secs, "sections")), el("div", { class: "fwlist" }, ...secs)));
  parts.push(group(`Sources (${b.sources.length})`, false, "srcs",
    el("ol", { class: "srclist" }, ...b.sources.map(s => el("li", { id: "src-" + s.n },
      el("a", { href: s.url, target: "_blank", rel: "noopener" }, s.title), ` — ${s.publisher}${s.date ? ", " + s.date : ""}`)))));
  parts.push(el("p", { class: "fine" }, `Written ${fmtDate(b.added)} with AI-assisted research from public sources. It is a general educational overview, not investment advice or a recommendation to buy or sell anything. Market figures move daily: check the linked sources before relying on any number.`));
  return parts;
}

// The basics: what the business is, what it sells, the vocabulary, and what moves it
function basicsBlock(x, root) {
  const dl = (rows, extra) => el("dl", { class: "bdl" }, ...rows.map(r => el("div", {},
    el("dt", {}, r[0]),
    el("dd", {}, ...cited(r[1], root), extra && extra(r) ? el("small", {}, extra(r)) : null))));
  return group("Start here: the basics", false, "basics",
    el("p", { class: "bintro" }, ...cited(x.intro, root)),
    el("div", { class: "brief-grid" },
      el("div", { class: "fact" }, el("h3", {}, "What they sell"),
        dl(x.products.map(p => [p.name, p.what, p.examples]), r => r[2] ? "e.g. " + r[2] : "")),
      el("div", { class: "fact" }, el("h3", {}, "What drives the business"),
        dl(x.drivers.map(d => [d.name, d.how])))),
    el("div", { class: "fact bterms" }, el("h3", {}, "Key terms"),
      dl(x.terms.map(t => [t.term, t.meaning]))));
}

function fundamentalsBlock(f, root) {
  const parts = FUNDAMENTALS.map(([id, title, lede, qs], i) => {
    const body = el("div", { class: "fwbody" }, el("p", { class: "fqlede" }, lede),
      el("dl", { class: "fq" }, ...qs.map((q, j) => el("div", {}, el("dt", {}, q), el("dd", {}, ...cited((f[id] || [])[j] || "", root))))));
    if (id === "risks" && f.horizon) {
      const h = f.horizon, list = (t, xs, cls) => el("div", { class: "hz " + cls }, el("h4", {}, t), el("ul", {}, ...xs.map(x => el("li", {}, ...cited(x, root)))));
      body.append(el("div", { class: "horizon" }, el("h4", { class: "hzt" }, "The next 3 to 5 years"),
        el("div", { class: "hzgrid" }, list("Biggest opportunities", h.opportunities, "up"), list("Biggest threats", h.threats, "down")),
        el("p", {}, ...cited(h.assessment, root))));
    }
    return el("details", { class: "fw" }, el("summary", {}, el("span", { class: "fwn" }, String(i + 1)), el("span", {}, title)), body);
  });
  return group("Industry fundamentals: six-part analysis", false, "",
    el("div", { class: "grptools" }, el("p", { class: "fqintro muted" }, "How the business works, how competition and the economy shape its results, what its finances look like, and what could change it."), openAll(parts, "parts")),
    el("div", { class: "fwlist" }, ...parts));
}

function renderResearch(v) {
  v.append(
    el("nav", { class: "crumbs", "aria-label": "Breadcrumb" }, el("button", { type: "button", onclick: () => go(null) }, "GICS"), el("span", { "aria-hidden": "true" }, "›"), el("span", {}, "Research briefs")),
    el("div", { class: "eyebrow" }, `${WI.length} of 163 sub-industries`),
    el("h1", {}, "Sub-industry research briefs"),
    el("p", { class: "lede" }, "Each brief opens with the basics (what the companies sell, the key terms and what drives the business) and a six-part fundamentals analysis (business model, industry overview, competition, economic drivers, financial characteristics, and risks over the next 3 to 5 years), then gives a current market view in eight steps: the economy, demand, competition, regulation and technology, financial fundamentals, earnings, valuation, and market positioning. Three new briefs are added each day, starting with the sectors that make up most of the S&P 500."),
    el("div", { class: "bar wbar" }, el("i", { class: "wfill" })));
  v.querySelector(".wfill").style.width = (WI.length / 163 * 100) + "%";
  const byDay = {};
  [...WI].sort((a, b) => b.added.localeCompare(a.added)).forEach(e => (byDay[e.added] = byDay[e.added] || []).push(e.code));
  if (!WI.length) v.append(el("p", { class: "muted" }, "The first briefs are on their way. They appear here as soon as the daily run publishes them."));
  Object.entries(byDay).forEach(([day, codes]) => v.append(
    el("div", { class: "sec-head" }, el("h2", {}, fmtDate(day)), el("span", {}, `${codes.length} brief${codes.length === 1 ? "" : "s"}`)),
    el("div", { class: "kids", h: HUES[codes[0].slice(0, 2)] }, ...codes.map(c => kidRow(c)))));
  const done = new Set(WI.map(e => e.code));
  const next = WQ ? WQ.queue.filter(c => !done.has(c)).slice(0, WQ.perDay) : [];
  if (next.length) v.append(el("div", { class: "sec-head" }, el("h2", {}, "Coming next"), el("span", {}, "in queue order")),
    el("div", { class: "kids" }, ...next.map(c => kidRow(c))));
}
