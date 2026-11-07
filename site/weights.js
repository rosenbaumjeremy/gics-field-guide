"use strict";
// Sector weights in the S&P 500 over time (data/weights.json), drawn as plain SVG.
// Bands always stack in GICS code order (Energy at the bottom). "all" colors every
// band by its sector hue; a single focus colors that band and greys the rest.
let W = null;
const SVGNS = "http://www.w3.org/2000/svg";
const SHORT = {10:"Energy",15:"Materials",20:"Industrials",25:"Cons. Discretionary",30:"Cons. Staples",35:"Health Care",40:"Financials",45:"Info. Technology",50:"Comm. Services",55:"Utilities",60:"Real Estate"};
const svgEl = (tag, attrs = {}, text) => {
  const e = document.createElementNS(SVGNS, tag);
  // hue goes through the CSSOM: the site's CSP blocks inline style="" attributes
  for (const [k, v] of Object.entries(attrs)) k === "hue" ? e.style.setProperty("--h", v) : e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  return e;
};
const pct = v => (v || 0).toFixed(1) + "%";
const sectorCodes = () => SECTORS.map(s => s.code);

function weightStats(code) {
  const pts = W.rows.map(r => ({ r, v: r.w[code] || 0 })).filter(p => p.v > 0);
  const first = pts[0], last = pts[pts.length - 1];
  const peak = pts.reduce((a, b) => (b.v > a.v ? b : a));
  const low = pts.reduce((a, b) => (b.v < a.v ? b : a));
  return { first, last, peak, low };
}

function weightChart(focus) {
  // phones get a narrower drawing with no edge labels, so the text stays readable when scaled
  const narrow = innerWidth < 640;
  const rows = W.rows, VW = narrow ? 380 : 820, VH = narrow ? 300 : 380, ml = 38, mr = narrow ? 8 : 150, mt = 14, mb = 30;
  const x0 = rows[0].x, x1 = rows[rows.length - 1].x;
  const X = x => ml + (x - x0) / (x1 - x0) * (VW - ml - mr);
  const Y = p => mt + (1 - p / 100) * (VH - mt - mb);
  const svg = svgEl("svg", { viewBox: `0 0 ${VW} ${VH}`, class: "wchart", role: "img",
    "aria-label": `Stacked area chart of S&P 500 sector weights from ${rows[0].short} to ${rows[rows.length - 1].label}, ${focus === "all" ? "each sector in its own color" : `with ${N[focus].name} highlighted`}.` });
  [0, 25, 50, 75, 100].forEach(p => {
    svg.append(svgEl("line", { x1: ml, x2: VW - mr, y1: Y(p), y2: Y(p), class: p ? "wgrid" : "waxis" }));
    svg.append(svgEl("text", { x: ml - 8, y: Y(p) + 4, class: "wtick", "text-anchor": "end" }, p + "%"));
  });
  for (let y = narrow ? 2000 : 1995; y <= 2025; y += narrow ? 10 : 5)
    svg.append(svgEl("text", { x: X(y), y: VH - 10, class: "wtick", "text-anchor": "middle" }, String(y)));

  const all = focus === "all";
  // the stacking order never changes, so the chart keeps its shape when the focus moves
  const order = sectorCodes();
  let base = rows.map(() => 0);
  const labels = [];
  order.forEach((code, i) => {
    const top = base.map((b, j) => b + (rows[j].w[code] || 0));
    const fwd = rows.map((r, j) => `${X(r.x).toFixed(1)},${Y(top[j]).toFixed(1)}`);
    const back = rows.map((r, j) => `${X(r.x).toFixed(1)},${Y(base[j]).toFixed(1)}`).reverse();
    const d = `M${fwd.join("L")}L${back.join("L")}Z`;
    if (all) {
      const p = svgEl("path", { d, class: "band-c", "data-h": "", hue: HUES[code] });
      p.append(svgEl("title", {}, N[code].name));
      svg.append(p);
    } else svg.append(svgEl("path", { d, class: code === focus ? "band-f" : (i % 2 ? "band-a" : "band-b") }));
    const lastV = rows[rows.length - 1].w[code] || 0;
    labels.push({ code, y: Y(base[base.length - 1] + lastV / 2), v: lastV, focus: code === focus });
    base = top;
  });
  // right-edge labels: the focused sector first, then any others that have room
  const placed = [];
  labels.sort((a, b) => (b.focus - a.focus) || (b.v - a.v)).forEach(l => {
    if (narrow || (!l.focus && (l.v < 3 || placed.some(p => Math.abs(p.y - l.y) < 13)))) return;
    placed.push(l);
    svg.append(svgEl("text", all ? { x: VW - mr + 8, y: l.y + 4, class: "wlabel c", "data-h": "", hue: HUES[l.code] }
      : { x: VW - mr + 8, y: l.y + 4, class: "wlabel" + (l.focus ? " on" : "") }, `${SHORT[l.code]} ${pct(l.v)}`));
  });
  // the stretch with no data points
  if (W.gap) {
    const g0 = X(W.gap[0]), g1 = X(W.gap[1]);
    svg.append(svgEl("rect", { x: g0, y: mt, width: g1 - g0, height: Y(0) - mt, class: "wgap" }));
    svg.append(svgEl("text", { x: (g0 + g1) / 2, y: mt + 14, class: "wtick", "text-anchor": "middle" }, "no data"));
  }
  const cross = svgEl("line", { y1: mt, y2: Y(0), class: "wcross", visibility: "hidden" });
  svg.append(cross);
  return { svg, cross, X, x0, x1, ml, mr, VW };
}

function renderWeights(v, focus) {
  if (!W) { v.append(el("p", { class: "lede" }, "The weights data didn't load. Check your connection and reload the page.")); return; }
  const all = focus === "all";
  if (!all && (!N[focus] || focus.length !== 2)) focus = "45";
  const s = all ? null : N[focus], st = all ? null : weightStats(focus);
  v.dataset.h = ""; v.style.setProperty("--h", all ? 220 : HUES[focus]);
  v.append(
    el("nav", { class: "crumbs", "aria-label": "Breadcrumb" }, el("button", { type: "button", onclick: () => go(null) }, "GICS"), el("span", { "aria-hidden": "true" }, "›"), el("span", {}, "Sector weights")),
    el("div", { class: "eyebrow" }, `S&P 500 · ${W.rows[0].short} to ${W.rows[W.rows.length - 1].short}`),
    el("h1", {}, "How the S&P 500's sector mix has shifted"),
    el("p", { class: "lede" }, "Each band is one sector's share of the index's total market value. All sectors shows each one in its own color; pick a single sector to highlight it in place, and hover the chart for exact figures."),
    el("div", { class: "wpick", role: "group", "aria-label": "Sector in focus" },
      el("button", { type: "button", class: "wchip wall", "aria-pressed": String(all), onclick: () => (location.hash = "weights-all") }, "All sectors"),
      ...SECTORS.map(x =>
      el("button", { type: "button", class: "wchip", h: HUES[x.code], "aria-pressed": String(x.code === focus), onclick: () => (location.hash = "weights-" + x.code) }, x.name)))
  );
  const { svg, cross, X, x0, x1, ml, mr, VW } = weightChart(focus);
  const tip = el("div", { class: "wtip", hidden: "" });
  const wrap = el("div", { class: "wwrap" }, svg, tip);
  const move = e => {
    const box = svg.getBoundingClientRect(), sx = (e.clientX - box.left) / box.width * VW;
    if (sx < ml - 10 || sx > VW - mr + 10) { leave(); return; }
    const xv = x0 + (sx - ml) / (VW - ml - mr) * (x1 - x0);
    const r = W.rows.reduce((a, b) => (Math.abs(b.x - xv) < Math.abs(a.x - xv) ? b : a));
    cross.setAttribute("x1", X(r.x)); cross.setAttribute("x2", X(r.x)); cross.setAttribute("visibility", "visible");
    tip.replaceChildren(el("b", {}, r.label), ...Object.entries(r.w).sort((a, b) => b[1] - a[1]).map(([c, w]) =>
      el("div", { class: "wrow" + (c === focus || all ? " on" : "") },
        el("span", {}, all ? el("i", { class: "wsw", h: HUES[c] }) : null, N[c].name), el("span", {}, pct(w)))));
    tip.hidden = false;
    const px = X(r.x) / VW * box.width, tw = tip.offsetWidth;
    tip.style.left = Math.max(0, Math.min(px + 14 + tw > box.width ? px - tw - 14 : px + 14, box.width - tw)) + "px";
  };
  const leave = () => { tip.hidden = true; cross.setAttribute("visibility", "hidden"); };
  svg.addEventListener("pointermove", move);
  svg.addEventListener("pointerdown", move);
  wrap.addEventListener("pointerleave", leave);
  v.append(wrap);

  const lastRow = W.rows[W.rows.length - 1];
  if (all) v.append(el("ul", { class: "wlegend", "aria-label": `Colors, with weights at ${lastRow.label}` },
    ...sectorCodes().slice().reverse().map(c => el("li", {},
      el("button", { type: "button", onclick: () => (location.hash = "weights-" + c) },
        el("i", { class: "wsw", h: HUES[c] }), el("span", {}, N[c].name), el("b", {}, pct(lastRow.w[c])))))));

  const statLine = (label, p) => el("div", { class: "wstat" }, el("span", {}, label), el("b", {}, pct(p.v)), el("small", {}, p.r.label));
  if (!all) v.append(el("div", { class: "wstats" },
    statLine(focus === "60" ? "First as a sector" : "Start", st.first), statLine("Peak", st.peak), statLine("Low", st.low), statLine("Latest", st.last)));
  if (s && s.note) v.append(el("div", { class: "note" }, el("b", {}, `About ${s.name}`), s.note));
  v.append(el("div", { class: "fine wfine" },
    el("p", {}, "Year-end weights from 1990 to 2025 (plus 3 July 2023), then 5 November 2026. The latest point is an estimate from SPY fund holdings, not an official S&P figure."),
    el("p", {}, "Sectors appear as classified at the time. Communication Services was telecom-only until September 2018, when Alphabet, Meta and Netflix moved into it, which explains its jump that year. Real Estate was part of Financials until 2016."),
    el("p", {}, "Sources: ", ...W.sources.flatMap((x, i) => [i ? "; " : "", el("a", { href: x.url, target: "_blank", rel: "noopener" }, x.name)]), ".")));
  const cols = sectorCodes();
  v.append(el("details", { class: "wtable" }, el("summary", {}, "Show the numbers"),
    el("div", { class: "wscroll" }, el("table", {},
      el("thead", {}, el("tr", {}, el("th", {}, "Date"), ...cols.map(c => el("th", { class: c === focus ? "on" : "" }, SHORT[c])))),
      el("tbody", {}, ...W.rows.map(r => el("tr", {}, el("th", {}, r.short), ...cols.map(c => el("td", { class: c === focus ? "on" : "" }, r.w[c] ? r.w[c].toFixed(1) : "–")))))))));
}

// Small card for a sector page: sparkline of its weight, with start, peak and latest.
function sectorWeightCard(code) {
  if (!W) return null;
  const st = weightStats(code), pts = W.rows.filter(r => r.w[code]);
  const x0 = W.rows[0].x, x1 = W.rows[W.rows.length - 1].x, max = Math.max(...pts.map(r => r.w[code]));
  const X = x => 4 + (x - x0) / (x1 - x0) * 252, Y = v => 52 - v / max * 44;
  const svg = svgEl("svg", { viewBox: "0 0 260 56", class: "spark", "aria-hidden": "true" });
  svg.append(svgEl("polyline", { points: pts.map(r => `${X(r.x).toFixed(1)},${Y(r.w[code]).toFixed(1)}`).join(" ") }));
  const lastR = pts[pts.length - 1];
  svg.append(svgEl("circle", { cx: X(lastR.x), cy: Y(lastR.w[code]), r: 3.5 }));
  return el("div", { class: "fact" }, el("h3", {}, "Weight in the S&P 500"), svg,
    el("p", { class: "wmini" }, `${pct(st.first.v)} (${st.first.r.short}) → ${pct(st.last.v)} (${st.last.r.short}). Peak ${pct(st.peak.v)} in ${st.peak.r.short}.`),
    el("button", { type: "button", class: "linkbtn", onclick: () => (location.hash = "weights-" + code) }, "See the full history →"));
}
