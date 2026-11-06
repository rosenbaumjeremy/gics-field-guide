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

function briefBody(b, root) {
  const parts = [];
  parts.push(el("div", { class: "brief-head" },
    el("div", {}, el("div", { class: "eyebrow" }, "Research brief"), el("h2", {}, "Sector research: eight-part framework")),
    el("span", { class: "asof" }, "Data as of " + fmtDate(b.asOf))));
  parts.push(el("div", { class: "bottomline" }, el("b", {}, "Bottom line"), el("p", {}, ...cited(b.summary, root))));
  parts.push(el("div", { class: "brief-grid" },
    el("div", { class: "fact" }, el("h3", {}, "Key figures"),
      el("table", { class: "kfig" }, el("tbody", {}, ...b.metrics.map(m => el("tr", {},
        el("th", {}, m.label),
        el("td", {}, el("b", {}, m.value), m.context ? el("small", {}, m.context) : null, ...cited(` [${m.source}]`, root))))))),
    el("div", { class: "fact" }, el("h3", {}, "What to watch"), el("ul", {}, ...b.watch.map(x => el("li", {}, ...cited(x, root)))),
      el("h3", { class: "gap-top" }, "Bellwethers"), el("div", { class: "chips" }, ...b.bellwethers.map(x => el("span", { class: "chip" }, x))))));
  const secs = b.sections.map((s, i) => el("details", { class: "fw" },
    el("summary", {}, el("span", { class: "fwn" }, String(i + 1)), el("span", {}, FRAMEWORK[s.id] || s.id)),
    el("div", { class: "fwbody" }, ...s.paragraphs.map(p => el("p", {}, ...cited(p, root))))));
  const toggle = el("button", { type: "button", class: "linkbtn", onclick: () => {
    const open = !secs.every(d => d.open); secs.forEach(d => (d.open = open)); toggle.textContent = open ? "Close all sections" : "Open all sections";
  } }, "Open all sections");
  parts.push(el("div", { class: "sec-head" }, el("h3", { class: "fwtitle" }, "The eight-part analysis"), toggle), el("div", { class: "fwlist" }, ...secs));
  parts.push(el("details", { class: "fw srcs" }, el("summary", {}, el("span", { class: "fwn" }, "§"), el("span", {}, `Sources (${b.sources.length})`)),
    el("ol", { class: "srclist" }, ...b.sources.map(s => el("li", { id: "src-" + s.n },
      el("a", { href: s.url, target: "_blank", rel: "noopener" }, s.title), ` — ${s.publisher}${s.date ? ", " + s.date : ""}`)))));
  parts.push(el("p", { class: "fine" }, `Written ${fmtDate(b.added)} with AI-assisted research from public sources. It is a general educational overview, not investment advice or a recommendation to buy or sell anything. Market figures move daily: check the linked sources before relying on any number.`));
  return parts;
}

function renderResearch(v) {
  v.append(
    el("nav", { class: "crumbs", "aria-label": "Breadcrumb" }, el("button", { type: "button", onclick: () => go(null) }, "GICS"), el("span", { "aria-hidden": "true" }, "›"), el("span", {}, "Research briefs")),
    el("div", { class: "eyebrow" }, `${WI.length} of 163 sub-industries`),
    el("h1", {}, "Sub-industry research briefs"),
    el("p", { class: "lede" }, "Each brief works through the same eight steps: the economy, demand, competition, regulation and technology, financial fundamentals, earnings, valuation, and market positioning. Three new briefs are added each day, starting with the sectors that make up most of the S&P 500."),
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
