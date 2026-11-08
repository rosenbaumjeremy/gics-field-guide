"use strict";
// Search inside the research briefs and the full results page (#search=<query>). Both read
// data/writeups/search.json (one row per passage: [code, loc, text]), built by
// scripts/build_library.py. It loads on first use.
let LIB = null, LIBP = null, PENDING = null;

function loadLib() {
  if (!LIBP) LIBP = fetch("data/writeups/search.json").then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(rows => { rows.forEach(r => r.push(r[2].toLowerCase())); LIB = rows; return rows; })
    .catch(e => { LIBP = null; throw e; });
  return LIBP;
}

const qTerms = q => q.toLowerCase().split(/\s+/).filter(Boolean);
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Brief search needs a few letters; plain codes are handled by the classification search
const briefSearchable = q => q.length >= 3 && !/^\d+$/.test(q);

// Matching passages, grouped by brief: [{code, hits:[row...]}], briefs with most mentions first
function briefHits(q) {
  const ts = qTerms(q), groups = {};
  LIB.forEach(r => { if (ts.every(t => r[3].includes(t))) (groups[r[0]] = groups[r[0]] || []).push(r); });
  return Object.entries(groups).map(([code, hits]) => ({ code, hits }))
    .sort((a, b) => b.hits.length - a.hits.length || ORDER.indexOf(a.code) - ORDER.indexOf(b.code));
}

function markNodes(s, ts) {
  if (!ts.length) return [s];
  const re = new RegExp("(" + ts.map(escRe).join("|") + ")", "gi");
  // with a capturing group, split puts the matches at the odd positions
  return s.split(re).map((part, i) => (i % 2 ? el("mark", {}, part) : part)).filter(x => x !== "");
}
function snippet(text, ts, radius) {
  const low = text.toLowerCase();
  let i = Math.min(...ts.map(t => { const k = low.indexOf(t); return k < 0 ? Infinity : k; }));
  if (!isFinite(i)) i = 0;
  let a = Math.max(0, i - radius), b = Math.min(text.length, i + radius * 2);
  if (a > 0) { const sp = text.indexOf(" ", a); if (sp >= 0 && sp < i) a = sp + 1; }
  if (b < text.length) { const sp = text.lastIndexOf(" ", b); if (sp > i) b = sp; }
  return markNodes((a > 0 ? "…" : "") + text.slice(a, b) + (b < text.length ? "…" : ""), ts);
}

function locLabel(loc) {
  const p = loc.split(".");
  if (p[0] === "summary") return "Bottom line";
  if (p[0] === "basics") return { intro: "The basics", products: "The basics · What they sell", drivers: "The basics · What drives the business", terms: "The basics · Key terms" }[p[1]] || "The basics";
  if (p[0] === "watch") return "What to watch";
  if (p[0] === "bellwethers") return "Bellwethers";
  if (p[0] === "fund") { const f = FUNDAMENTALS.find(x => x[0] === p[1]); return f ? `${f[1]} · ${f[3][+p[2]] || ""}` : "Fundamentals"; }
  if (p[0] === "horizon") return "Risks · The next 3 to 5 years";
  if (p[0] === "sec") return "Market view · " + (FRAMEWORK[p[1]] || p[1]);
  return "";
}

// Open a brief at one passage: the brief renders, then revealHit opens its parts and scrolls
function openHit(code, loc, q) {
  PENDING = { code, loc, q };
  if (current === code) revealHit(code, $("view")); else go(code);
}
function revealHit(code, root) {
  if (!PENDING || PENDING.code !== code) return;
  const { loc, q } = PENDING; PENDING = null;
  const target = root.querySelector(`[data-loc="${loc}"]`);
  if (!target) return;
  for (let d = target.closest("details"); d; d = d.parentElement && d.parentElement.closest("details")) d.open = true;
  markIn(target, qTerms(q));
  setTimeout(() => {
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    target.classList.add("hitflash"); setTimeout(() => target.classList.remove("hitflash"), 2400);
  }, 80);
}
function markIn(node, ts) {
  if (!ts.length) return;
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, { acceptNode: n =>
    n.parentElement.closest(".cite,mark") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(n => { if (ts.some(t => n.nodeValue.toLowerCase().includes(t))) n.replaceWith(...markNodes(n.nodeValue, ts)); });
}

function hitButton(row, ts, q, radius) {
  return el("button", { type: "button", class: "hit", onclick: () => openHit(row[0], row[1], q) },
    el("span", { class: "hitloc" }, locLabel(row[1])),
    el("span", { class: "hitsnip" }, ...snippet(row[2], ts, radius)));
}

// The "In research briefs" part of the side panel's search results
function railBriefHits(t, q) {
  if (!briefSearchable(q)) return;
  if (!LIB) {
    t.append(el("li", { class: "empty" }, "Searching the research briefs…"));
    loadLib().then(() => { if ($("q").value.trim().toLowerCase() === q) renderTree(); })
      .catch(() => { if ($("q").value.trim().toLowerCase() === q) { const e = t.querySelector(".empty:last-child"); if (e) e.textContent = "The brief search didn't load. Check your connection."; } });
    return;
  }
  const groups = briefHits(q), ts = qTerms(q);
  const total = groups.reduce((n, g) => n + g.hits.length, 0);
  t.append(el("li", { class: "rhead" }, total ? `In research briefs · ${total} mention${total === 1 ? "" : "s"} in ${groups.length} brief${groups.length === 1 ? "" : "s"}` : "In research briefs"));
  if (!total) { t.append(el("li", { class: "empty" }, "Not mentioned in any published brief.")); return; }
  groups.slice(0, 5).forEach(g => t.append(el("li", {}, el("div", { class: "rhit", h: HUES[g.code.slice(0, 2)] },
    el("span", { class: "rname" }, N[g.code].name, g.hits.length > 1 ? el("small", {}, ` · ${g.hits.length}`) : null),
    hitButton(g.hits[0], ts, q, 50)))));
  t.append(el("li", {}, el("button", { type: "button", class: "linkbtn rall", onclick: () => (location.hash = "search=" + encodeURIComponent(q)) },
    `See all ${total} mention${total === 1 ? "" : "s"} →`)));
}

function classificationHits(q) {
  return ORDER.filter(c => c.startsWith(q) || N[c].name.toLowerCase().includes(q) || N[c].desc.toLowerCase().includes(q) || (N[c].note || "").toLowerCase().includes(q))
    .sort((a, b) => (N[b].name.toLowerCase().includes(q)) - (N[a].name.toLowerCase().includes(q)));
}

function renderSearch(v, q) {
  const ts = qTerms(q);
  const input = el("input", { class: "search big", type: "search", value: q, "aria-label": "Search the guide and the research briefs", placeholder: "Search topics, companies, terms…" });
  input.addEventListener("keydown", e => { if (e.key === "Enter" && input.value.trim()) location.hash = "search=" + encodeURIComponent(input.value.trim()); });
  v.append(
    el("nav", { class: "crumbs", "aria-label": "Breadcrumb" }, el("button", { type: "button", onclick: () => go(null) }, "GICS"), el("span", { "aria-hidden": "true" }, "›"), el("span", {}, "Search")),
    el("div", { class: "eyebrow" }, "Search"),
    el("h1", {}, `“${q}”`), input);
  const cls = classificationHits(q.toLowerCase());
  if (cls.length) v.append(el("div", { class: "sec-head" }, el("h2", {}, "In the classification"), el("span", {}, `${cls.length} match${cls.length === 1 ? "" : "es"}`)),
    el("div", { class: "kids" }, ...cls.slice(0, 12).map(c => kidRow(c))));
  const box = el("div", {}, el("p", { class: "muted" }, "Searching the research briefs…"));
  v.append(box);
  if (!briefSearchable(q)) { box.replaceChildren(el("p", { class: "muted" }, "Type at least three letters to search inside the research briefs.")); return; }
  loadLib().then(() => {
    const groups = briefHits(q), total = groups.reduce((n, g) => n + g.hits.length, 0);
    box.replaceChildren(el("div", { class: "sec-head" }, el("h2", {}, "In the research briefs"),
      el("span", {}, total ? `${total} mention${total === 1 ? "" : "s"} in ${groups.length} of ${WI.length} briefs` : `none in ${WI.length} briefs`)));
    if (!total) { box.append(el("p", { class: "muted" }, "No published brief mentions this yet. Try a shorter or different word.")); return; }
    groups.forEach(g => box.append(el("section", { class: "hitgroup", h: HUES[g.code.slice(0, 2)] },
      el("div", { class: "hitgh" },
        el("button", { type: "button", class: "linkbtn", onclick: () => go(g.code) }, N[g.code].name),
        el("span", {}, `${N[N[g.code].sector].name} · ${g.hits.length} mention${g.hits.length === 1 ? "" : "s"}`)),
      el("div", { class: "hitlist" }, ...g.hits.map(r => hitButton(r, ts, q, 120))))));
  }).catch(() => box.replaceChildren(el("p", { class: "muted" }, "The brief search didn't load. Check your connection and reload the page.")));
}
