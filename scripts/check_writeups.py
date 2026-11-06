"""Check the sub-industry research briefs before publishing. Exit 1 with a list of problems.

Usage: python scripts/check_writeups.py

Checks site/data/writeups/index.json against the brief files (<code>.json), and each brief
against the format in ROUTINE.md: the basics block, the eight framework sections in order, length limits,
and that every [n] citation points at a listed source and every section cites something.
"""
import json
import re
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "site" / "data"
WDIR = DATA / "writeups"
SECTIONS = ["macro", "demand", "structure", "environment", "economics", "earnings", "valuation", "positioning"]
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
CITE = re.compile(r"\[(\d+)\]")
errors = []


def load(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        errors.append(f"{path.name}: does not parse: {e}")
        return None


def words(s):
    return len(s.split())


gics = {r["code"]: r for r in load(DATA / "gics.json") or []}
queue = load(WDIR / "queue.json") or {"queue": []}
index = load(WDIR / "index.json")
if not isinstance(index, list):
    errors.append("index.json must be a list")
    index = []

q = queue["queue"]
if len(q) != 163 or len(set(q)) != 163 or any(len(c) != 8 or c not in gics for c in q):
    errors.append("queue.json must list all 163 sub-industry codes once each")

seen = set()
for n, e in enumerate(index):
    code = e.get("code") if isinstance(e, dict) else None
    where = f"index.json entry {n} ({code})"
    if code not in gics or len(code or "") != 8:
        errors.append(f"{where}: not a sub-industry code")
        continue
    if code in seen:
        errors.append(f"{where}: listed twice")
    seen.add(code)
    if not DATE.match(str(e.get("added", ""))):
        errors.append(f"{where}: 'added' must be YYYY-MM-DD")
    if not (WDIR / f"{code}.json").exists():
        errors.append(f"{where}: no file {code}.json")

for path in sorted(WDIR.glob("[0-9]*.json")):
    code = path.stem
    if code not in seen:
        errors.append(f"{path.name}: not listed in index.json")
    b = load(path)
    if not isinstance(b, dict):
        continue
    w = path.name
    if b.get("code") != code:
        errors.append(f"{w}: 'code' must be {code}")
    for key in ("added", "asOf"):
        if not DATE.match(str(b.get(key, ""))):
            errors.append(f"{w}: '{key}' must be YYYY-MM-DD")
    entry = next((e for e in index if isinstance(e, dict) and e.get("code") == code), None)
    if entry and entry.get("added") != b.get("added"):
        errors.append(f"{w}: 'added' differs from index.json")

    sources = b.get("sources")
    if not isinstance(sources, list) or len(sources) < 6:
        errors.append(f"{w}: needs at least 6 sources")
        sources = []
    for i, s in enumerate(sources, 1):
        if not isinstance(s, dict) or s.get("n") != i:
            errors.append(f"{w}: source {i} must have \"n\": {i} (numbered 1, 2, 3 ... in order)")
            continue
        if not str(s.get("url", "")).startswith("https://"):
            errors.append(f"{w}: source {i} needs an https:// url")
        for key in ("title", "publisher"):
            if not str(s.get(key, "")).strip():
                errors.append(f"{w}: source {i} needs '{key}'")
        if s.get("date") and not re.match(r"^\d{4}(-\d{2}(-\d{2})?)?$", str(s["date"])):
            errors.append(f"{w}: source {i} 'date' must be YYYY, YYYY-MM or YYYY-MM-DD")
    nsrc = len(sources)
    used = set()

    def cites(text, where):
        found = [int(x) for x in CITE.findall(text)]
        for x in found:
            if not 1 <= x <= nsrc:
                errors.append(f"{w} {where}: cites [{x}] but there are {nsrc} sources")
        used.update(found)
        return found

    summary = b.get("summary", "")
    if not isinstance(summary, str) or not 40 <= words(summary) <= 140:
        errors.append(f"{w}: 'summary' must be 40-140 words")
    else:
        cites(summary, "summary")
    watch = b.get("watch")
    if not isinstance(watch, list) or not 3 <= len(watch) <= 6 or not all(isinstance(x, str) and x.strip() for x in watch):
        errors.append(f"{w}: 'watch' must be 3-6 strings")
    else:
        for i, x in enumerate(watch):
            cites(x, f"watch {i + 1}")

    metrics = b.get("metrics")
    if not isinstance(metrics, list) or not 4 <= len(metrics) <= 10:
        errors.append(f"{w}: 'metrics' must have 4-10 rows")
        metrics = []
    for i, m in enumerate(metrics, 1):
        if not isinstance(m, dict) or not all(str(m.get(k, "")).strip() for k in ("label", "value")):
            errors.append(f"{w}: metric {i} needs 'label' and 'value'")
            continue
        if not isinstance(m.get("source"), int) or not 1 <= m["source"] <= nsrc:
            errors.append(f"{w}: metric {i} needs 'source' (a source number)")
        else:
            used.add(m["source"])

    basics = b.get("basics")
    if not isinstance(basics, dict):
        errors.append(f"{w}: needs 'basics' (intro, products, terms, drivers)")
    else:
        intro = basics.get("intro")
        if not isinstance(intro, str) or not 30 <= words(intro) <= 120:
            errors.append(f"{w} basics: 'intro' must be 30-120 words")
        else:
            cites(intro, "basics intro")
        for key, lo, hi, fields in (("products", 3, 8, ("name", "what")), ("terms", 8, 16, ("term", "meaning")), ("drivers", 4, 8, ("name", "how"))):
            rows = basics.get(key)
            if not isinstance(rows, list) or not lo <= len(rows) <= hi:
                errors.append(f"{w} basics: '{key}' must have {lo}-{hi} entries")
                continue
            for i, r in enumerate(rows, 1):
                if not isinstance(r, dict) or not all(isinstance(r.get(f), str) and r[f].strip() for f in fields):
                    errors.append(f"{w} basics {key} {i}: needs {' and '.join(repr(f) for f in fields)}")
                    continue
                body = r[fields[1]]
                if words(body) > 70:
                    errors.append(f"{w} basics {key} {i}: '{fields[1]}' is {words(body)} words (max 70)")
                cites(body, f"basics {key} {i}")
                if "examples" in r and not (isinstance(r["examples"], str) and r["examples"].strip()):
                    errors.append(f"{w} basics {key} {i}: 'examples' must be a non-empty string")

    names = b.get("bellwethers")
    if not isinstance(names, list) or not 3 <= len(names) <= 10:
        errors.append(f"{w}: 'bellwethers' must list 3-10 companies")

    secs = b.get("sections")
    if not isinstance(secs, list) or [s.get("id") if isinstance(s, dict) else None for s in secs] != SECTIONS:
        errors.append(f"{w}: 'sections' must be the eight framework sections in order: {', '.join(SECTIONS)}")
        secs = []
    total = 0
    for s in secs:
        paras = s.get("paragraphs")
        if not isinstance(paras, list) or not 1 <= len(paras) <= 4 or not all(isinstance(p, str) and p.strip() for p in paras):
            errors.append(f"{w} {s['id']}: 'paragraphs' must be 1-4 non-empty strings")
            continue
        n = sum(words(p) for p in paras)
        total += n
        if not 110 <= n <= 330:
            errors.append(f"{w} {s['id']}: {n} words (needs 110-330)")
        if not sum(len(cites(p, s["id"])) for p in paras):
            errors.append(f"{w} {s['id']}: cites no source")
    if secs and not 1100 <= total <= 2300:
        errors.append(f"{w}: sections total {total} words (needs 1100-2300)")
    unused = set(range(1, nsrc + 1)) - used
    if unused:
        errors.append(f"{w}: sources never cited: {sorted(unused)}")

if errors:
    print("FAIL:\n  " + "\n  ".join(errors))
    sys.exit(1)
print(f"OK: {len(index)} briefs published, {163 - len(index)} to go")
