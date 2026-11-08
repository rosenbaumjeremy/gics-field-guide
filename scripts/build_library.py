"""Build the search file the site uses to search inside every research brief.

Usage: python scripts/build_library.py

Reads every site/data/writeups/<code>.json listed in index.json and writes search.json: one row
per passage, [code, loc, text]. loc says where the passage sits in the brief (e.g.
"fund.risks.1", "sec.macro.0") so the site can open and scroll to it.
publish.py runs this before committing, so the daily routine never has to.
"""
import json
import re
from pathlib import Path

WDIR = Path(__file__).resolve().parent.parent / "site" / "data" / "writeups"
FUND = ["business", "overview", "competition", "drivers", "financials", "risks"]


def passages(code, b):
    rows = [[code, "summary", b["summary"]]]
    x = b.get("basics") or {}
    if x:
        rows.append([code, "basics.intro", x["intro"]])
        for i, p in enumerate(x.get("products", [])):
            rows.append([code, f"basics.products.{i}", f"{p['name']}: {p['what']}" + (f" e.g. {p['examples']}" if p.get("examples") else "")])
        for i, d in enumerate(x.get("drivers", [])):
            rows.append([code, f"basics.drivers.{i}", f"{d['name']}: {d['how']}"])
        for i, t in enumerate(x.get("terms", [])):
            rows.append([code, f"basics.terms.{i}", f"{t['term']}: {t['meaning']}"])
    for i, w in enumerate(b.get("watch", [])):
        rows.append([code, f"watch.{i}", w])
    if b.get("bellwethers"):
        rows.append([code, "bellwethers", ", ".join(b["bellwethers"])])
    f = b.get("fundamentals") or {}
    for part in FUND:
        for j, a in enumerate(f.get(part, [])):
            rows.append([code, f"fund.{part}.{j}", a])
    h = f.get("horizon") or {}
    for key in ("opportunities", "threats"):
        for i, t in enumerate(h.get(key, [])):
            rows.append([code, f"horizon.{key}.{i}", t])
    if h.get("assessment"):
        rows.append([code, "horizon.assessment", h["assessment"]])
    for s in b.get("sections", []):
        for p, text in enumerate(s["paragraphs"]):
            rows.append([code, f"sec.{s['id']}.{p}", text])
    # citations are links on the page; in search they are noise
    return [[c, loc, re.sub(r"\s*\[\d+\]", "", t).strip()] for c, loc, t in rows]


def build():
    index = json.loads((WDIR / "index.json").read_text(encoding="utf-8"))
    search = []
    for e in index:
        search += passages(e["code"], json.loads((WDIR / f"{e['code']}.json").read_text(encoding="utf-8")))
    return search


def main():
    search = build()
    (WDIR / "search.json").write_text(json.dumps(search, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"search.json: {len(search)} passages")


if __name__ == "__main__":
    main()
