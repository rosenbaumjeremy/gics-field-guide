"""Say which sub-industry briefs the daily routine should write today.

Usage: python scripts/next_writeups.py [YYYY-MM-DD]   (date defaults to today in Asia/Jerusalem)

Prints one line per brief to write, with its code, name and place in the hierarchy, or
"DONE <date>" when today's quota (perDay in queue.json) is already published, or
"FINISHED" when every sub-industry has a brief.
"""
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "site" / "data"


def israel_today():
    try:
        from zoneinfo import ZoneInfo
        return datetime.now(ZoneInfo("Asia/Jerusalem")).strftime("%Y-%m-%d")
    except Exception:  # no time-zone database (e.g. Windows without tzdata): UTC+2 is close enough
        return datetime.now(timezone(timedelta(hours=2))).strftime("%Y-%m-%d")



def main():
    today = sys.argv[1] if len(sys.argv) > 1 else israel_today()

    queue = json.loads((ROOT / "writeups" / "queue.json").read_text(encoding="utf-8"))
    index = json.loads((ROOT / "writeups" / "index.json").read_text(encoding="utf-8"))
    names = {r["code"]: r["name"] for r in json.loads((ROOT / "gics.json").read_text(encoding="utf-8"))}

    done = {e["code"] for e in index}
    written_today = sum(1 for e in index if e["added"] == today)
    todo = [c for c in queue["queue"] if c not in done]

    if not todo:
        print("FINISHED")
        sys.exit(0)
    left = queue["perDay"] - written_today
    if left <= 0:
        print(f"DONE {today}")
        sys.exit(0)

    print(f"DATE {today}  ({written_today} already published today, {len(done)} of {len(queue['queue'])} overall)")
    for code in todo[:left]:
        path = " > ".join(names[code[:n]] for n in (2, 4, 6))
        print(f"WRITE {code}  {names[code]}  [{path}]")


if __name__ == "__main__":
    main()
