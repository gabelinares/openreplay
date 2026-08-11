#!/usr/bin/env bash
# Show one feature's changes, or verify every feature branch still matches main.
# See FEATURES.md for what each branch owns and the order they merge in.
set -uo pipefail

BASE=50a12ac7a          # last upstream commit in this fork (2026-06-02)
INTEGRATION=main

# feature:parent:owned paths (space separated)
FEATURES=(
"harness:feature/ai-issues:frontend/.vercelignore frontend/.env.sample frontend/vercel.json frontend/package.json frontend/CLAUDE.md frontend/app/dev frontend/app/initialize.tsx frontend/app/components/Client/DrawerGallery frontend/app/assets/img/mockEcommerce.png frontend/app/assets/img/mockEcommerce.svg"
"shared-ui:$BASE:frontend/.gitignore frontend/app/components/shared/CountSuffix.tsx frontend/app/components/ui frontend/app/svg/icons/scan-pulse.svg frontend/app/svg/icons/stars.svg frontend/app/constants/panelSizes.ts frontend/app/layout/SideMenu/MenuContent.tsx frontend/app/components/Session_/SessionInfoItem/SessionInfoItem.tsx"
"ai-issues:feature/shared-ui:frontend/app/components/Issues frontend/app/mstore/issuesStore.ts frontend/app/components/DataManagement/Segments frontend/app/components/shared/SessionItem/SessionItem.tsx frontend/HANDOFF.md"
"test-agents:feature/shared-ui:frontend/app/components/Client/KaiSettings"
"ux-audit:feature/ai-issues:frontend/app/components/Audits"
"preferences-agents:feature/test-agents:frontend/app/components/Client/AgentsPreferences frontend/app/components/Client/Audit/AuditView/AuditView.tsx"
)

# shared shell files every feature adds its own route/nav/store line to
WIRING="frontend/app/routes.ts frontend/app/PrivateRoutes.tsx frontend/app/layout/data.ts frontend/app/layout/SideMenu/index.tsx frontend/app/utils/routeUtils.ts frontend/app/mstore/index.tsx frontend/app/components/Client/Client.tsx"

branch_of() { case "$1" in harness) echo "harness/prototype-mocks";; *) echo "feature/$1";; esac; }

# A branch that merged in another feature (preferences-agents) must be measured
# from its own merge commit, or it reports its parent's work as its own.
baseline_of() {
  local parent="$1" br="$2" m
  m=$(git rev-list --merges -1 "$parent..$br" 2>/dev/null)
  [ -n "$m" ] && echo "$m" || echo "$parent"
}

lookup() {
  for row in "${FEATURES[@]}"; do
    [ "${row%%:*}" = "$1" ] && { echo "$row"; return 0; }
  done
  return 1
}

usage() {
  cat <<EOF
usage: tools/feature-diff.sh [<feature>] [--stat|--files] | --check

  (no args)          list the features
  <feature>          that feature's diff against its parent branch
  <feature> --stat   file list only
  <feature> --files  bare filenames, for piping
  --check            verify each branch's owned paths still match $INTEGRATION
  --drift            measure how far upstream/dev has moved under these branches

features: $(for r in "${FEATURES[@]}"; do printf "%s " "${r%%:*}"; done)
EOF
}

list() {
  printf "%-20s %-24s %8s  %s\n" FEATURE BRANCH COMMITS CHANGES
  for row in "${FEATURES[@]}"; do
    name="${row%%:*}"; rest="${row#*:}"; parent="${rest%%:*}"; paths="${rest#*:}"
    br=$(branch_of "$name")
    if ! git rev-parse --verify -q "$br" >/dev/null; then
      printf "%-20s %-24s %8s  %s\n" "$name" "$br" "-" "branch missing"
      continue
    fi
    b=$(baseline_of "$parent" "$br")
    n=$(git rev-list --count --no-merges "$b..$br" 2>/dev/null || echo "?")
    s=$(git diff --shortstat "$b" "$br" -- $paths $WIRING 2>/dev/null | sed 's/^ *//')
    printf "%-20s %-24s %8s  %s\n" "$name" "$br" "$n" "$s"
  done
  echo
  echo "merge order: shared-ui -> {ai-issues -> {ux-audit, harness}, test-agents -> preferences-agents}"
  echo "harness/prototype-mocks sits on ai-issues (it seeds Issues' fixtures) and must never ship."
}

check() {
  fail=0

  # --- per branch -----------------------------------------------------------
  for row in "${FEATURES[@]}"; do
    name="${row%%:*}"; rest="${row#*:}"; paths="${rest#*:}"
    br=$(branch_of "$name")
    if ! git rev-parse --verify -q "$br" >/dev/null; then
      printf "%-22s BRANCH MISSING\n" "$name"; fail=1; continue
    fi
    msg=""
    # 1. owned paths identical to the integration branch
    if out=$(git diff --stat "$br" "$INTEGRATION" -- $paths) && [ -z "$out" ]; then
      msg="paths match $INTEGRATION"
    else
      msg="OWNED PATHS DIFFER from $INTEGRATION"; fail=1
    fi
    # 2. nothing outside frontend/ (tools/ and FEATURES.md live on $INTEGRATION only)
    stray=$(git diff --name-only "$BASE" "$br" -- . ':(exclude)frontend' ':(exclude)tools' ':(exclude)FEATURES.md' || true)
    [ -n "$stray" ] && { msg="$msg; NON-FRONTEND: $(echo "$stray" | tr '\n' ' ')"; fail=1; }
    # 3. no source file git treats as binary. a stray NUL byte in a .tsx means
    #    no line diff, no blame and nothing to review; numstat reports "-  -".
    binsrc=$(git diff --numstat "$BASE" "$br" -- '*.ts' '*.tsx' '*.js' '*.jsx' \
             | awk '$1=="-" {print $3}' | tr '\n' ' ')
    [ -n "$binsrc" ] && { msg="$msg; BINARY-CLASSIFIED SOURCE: $binsrc"; fail=1; }
    printf "%-22s %s\n" "$name" "$msg"
  done

  # --- ownership must be disjoint ------------------------------------------
  echo
  dupes=$(for row in "${FEATURES[@]}"; do
            name="${row%%:*}"; rest="${row#*:}"; paths="${rest#*:}"
            for p in $paths; do echo "$p"; done
          done | sort | uniq -d)
  if [ -n "$dupes" ]; then
    echo "OWNERSHIP OVERLAP: $(echo "$dupes" | tr '\n' ' ')"; fail=1
  else
    echo "ownership is disjoint"
  fi

  # every changed file is owned by exactly one feature, or is wiring
  unowned=""
  allpaths=$(for row in "${FEATURES[@]}"; do rest="${row#*:}"; echo "${rest#*:}"; done)
  for f in $(git diff --name-only "$BASE" "$INTEGRATION" -- frontend); do
    hit=0
    for p in $allpaths $WIRING; do
      case "$f" in "$p"|"$p"/*) hit=1; break;; esac
    done
    [ "$hit" -eq 0 ] && unowned="$unowned $f"
  done
  if [ -n "$unowned" ]; then
    echo "UNCLAIMED FILES (owned by no feature and not wiring):$unowned"; fail=1
  else
    echo "every changed file is claimed"
  fi

  # --- each branch must resolve its own imports ----------------------------
  # this is the check that catches "feature A imports a file that only exists
  # on branch B", i.e. a branch that cannot build on its own.
  echo
  for row in "${FEATURES[@]}"; do
    name="${row%%:*}"; rest="${row#*:}"; paths="${rest#*:}"
    br=$(branch_of "$name")
    git rev-parse --verify -q "$br" >/dev/null || continue
    out=$(BRANCH="$br" LABEL="$name" PATHS="$paths" python3 "$(dirname "$0")/check-imports.py")
    rc=$?
    if [ "$rc" -ne 0 ]; then echo "$out"; fail=1
    elif [ -n "$out" ]; then echo "$out"
    else printf "%-22s imports resolve within the branch\n" "$name"; fi
  done

  echo
  if [ "$fail" -eq 0 ]; then echo "OK: every branch is consistent with $INTEGRATION."
  else echo "PROBLEMS FOUND (see above)."; fi
  return $fail
}

drift() {
  ref=upstream/dev
  git rev-parse --verify -q "$ref" >/dev/null || {
    echo "$ref not fetched. run: git fetch upstream dev"; return 1; }
  echo "base:        $(git log --format='%h %ad %s' --date=short -1 $BASE | cut -c1-90)"
  echo "$ref: $(git log --format='%h %ad %s' --date=short -1 $ref | cut -c1-90)"
  echo
  echo "commits on $ref since base:            $(git rev-list --count $BASE..$ref)"
  echo "  of those touching frontend/:         $(git rev-list --count $BASE..$ref -- frontend)"
  echo "frontend files changed upstream:       $(git diff --name-only $BASE $ref -- frontend | wc -l | tr -d ' ')"
  echo "frontend files changed here:           $(git diff --name-only $BASE $INTEGRATION -- frontend | wc -l | tr -d ' ')"
  echo
  echo "OVERLAP, i.e. the actual conflict surface:"
  comm -12 <(git diff --name-only $BASE $ref -- frontend | sort) \
           <(git diff --name-only $BASE $INTEGRATION -- frontend | sort) | sed 's/^/  /'
  echo
  echo "Feature directories are listed above only if upstream touched them. If none"
  echo "appear, the feature code cannot rot and there is nothing to merge yet."
}

case "${1:-}" in
  ""|-l|--list) list ;;
  -h|--help)    usage ;;
  --check)      check ;;
  --drift)      drift ;;
  *)
    row=$(lookup "$1") || { echo "unknown feature: $1"; echo; usage; exit 1; }
    name="${row%%:*}"; rest="${row#*:}"; parent="${rest%%:*}"; paths="${rest#*:}"
    br=$(branch_of "$name")
    git rev-parse --verify -q "$br" >/dev/null || { echo "branch $br does not exist"; exit 1; }
    b=$(baseline_of "$parent" "$br")
    case "${2:-}" in
      --stat)  git diff --stat "$b" "$br" -- $paths $WIRING ;;
      --files) git diff --name-only "$b" "$br" -- $paths $WIRING ;;
      "")      git diff "$b" "$br" -- $paths $WIRING ;;
      *)       echo "unknown option: $2"; usage; exit 1 ;;
    esac ;;
esac
