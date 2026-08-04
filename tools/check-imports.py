#!/usr/bin/env python3
"""Does a feature branch resolve its own imports?

Reads BRANCH and PATHS from the environment, walks every .ts/.tsx file the
branch owns, and checks each App/... or Components/... import against that
branch's own tree. Exits non-zero and prints the misses.

This is the check that catches "feature A imports a file that only exists on
branch B", i.e. a branch that cannot build on its own. Called by
tools/feature-diff.sh --check.
"""
import os
import subprocess
import sys
import re

BRANCH = os.environ["BRANCH"]
PATHS = os.environ["PATHS"].split()

# Known and tracked, so a NEW unresolved import still fails the check.
# See FEATURES.md, "The one dependency that is wrong".
KNOWN = {
    ("feature/ai-issues", "App/dev/mockSessions"),
    ("feature/ux-audit", "App/dev/mockSessions"),
    ("feature/preferences-agents", "App/dev/mockSessions"),
}
EXTS = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js"]
IMPORT = re.compile(r"""(?:from|import)\s+['"]((?:App|Components)/[^'"]+)['"]""")


def git(*args):
    r = subprocess.run(["git"] + list(args), capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else ""


def exists(path):
    return subprocess.run(
        ["git", "cat-file", "-e", f"{BRANCH}:{path}"],
        capture_output=True,
    ).returncode == 0


def to_path(spec):
    if spec.startswith("App/"):
        return "frontend/app/" + spec[len("App/"):]
    return "frontend/app/components/" + spec[len("Components/"):]


files = [
    f for f in git("ls-tree", "-r", "--name-only", BRANCH, "--", *PATHS).split()
    if f.endswith((".ts", ".tsx"))
]

misses, known = [], []
for f in files:
    src = git("cat-file", "-p", f"{BRANCH}:{f}")
    for spec in sorted(set(IMPORT.findall(src))):
        target = to_path(spec)
        if not any(exists(target + e) for e in EXTS):
            (known if (BRANCH, spec) in KNOWN else misses).append((f, spec))

label = os.environ.get("LABEL", BRANCH)
if misses:
    print(f"{label:<22} UNRESOLVED IMPORTS:")
    for f, spec in misses:
        print(f"                       {f} -> {spec}")
    sys.exit(1)
if known:
    specs = sorted({s for _, s in known})
    print(f"{label:<22} resolves, except {len(known)} known: {', '.join(specs)}")
    sys.exit(0)
sys.exit(0)
