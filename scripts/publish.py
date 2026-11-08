"""Commit and push today's research briefs (the routine's last step).

Usage: python scripts/publish.py

Runs check_writeups.py first, commits site/data/writeups with a message naming the briefs
added today, and pushes to main, rebasing and retrying if main moved. If main refuses the
push, pushes to claude/briefs-<date> instead. Prints the outcome on the last line.
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from next_writeups import israel_today  # noqa: E402  (same date rule as the picker)


def git(*args, check=True):
    r = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True)
    if check and r.returncode:
        print(r.stdout + r.stderr)
        sys.exit(f"git {' '.join(args)} failed")
    return r


if subprocess.run([sys.executable, str(ROOT / "scripts" / "check_writeups.py")], cwd=ROOT).returncode:
    sys.exit("Not publishing: fix what check_writeups.py reports first.")
# search.json is built from the briefs, so rebuild it with every publish
if subprocess.run([sys.executable, str(ROOT / "scripts" / "build_library.py")], cwd=ROOT).returncode:
    sys.exit("Not publishing: build_library.py failed.")

today = israel_today()
names = {r["code"]: r["name"] for r in json.loads((ROOT / "site/data/gics.json").read_text(encoding="utf-8"))}
index = json.loads((ROOT / "site/data/writeups/index.json").read_text(encoding="utf-8"))
todays = [names[e["code"]] for e in index if e["added"] == today]

git("add", "site/data/writeups")
if not git("diff", "--cached", "--quiet", check=False).returncode:
    print("NOTHING TO PUBLISH: no changes in site/data/writeups.")
    sys.exit(0)
msg = f"Research briefs {today}: " + ", ".join(todays or ["updates"])
git("-c", "user.name=GICS Field Guide routine", "-c", "user.email=rosenbaum.jeremy@gmail.com", "commit", "-q", "-m", msg)

for attempt in range(3):
    r = git("push", "origin", "HEAD:main", check=False)
    if not r.returncode:
        print(f"PUBLISHED to main: {msg}")
        sys.exit(0)
    err = r.stderr.lower()
    if "rejected" in err or "fetch first" in err or "non-fast-forward" in err:
        git("pull", "--rebase", "origin", "main")
        continue
    break

branch = f"claude/briefs-{today}"
r = git("push", "origin", f"HEAD:refs/heads/{branch}", check=False)
if r.returncode:
    print(r.stderr)
    sys.exit("PUSH FAILED on main and on the fallback branch.")
print(f"PUSHED TO BRANCH {branch} (main refused the push). Merge it into main to publish.")
