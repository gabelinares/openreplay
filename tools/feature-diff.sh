#!/usr/bin/env bash
# Show one feature's changes, or verify every feature branch still matches main.
# See FEATURES.md for what each branch owns and the order they merge in.
set -uo pipefail

BASE=50a12ac7a          # last upstream commit in this fork (2026-06-02)
INTEGRATION=main

# feature:parent:owned paths (space separated)
FEATURES=(
"harness:$BASE:frontend/.gitignore frontend/.vercelignore frontend/.env.sample frontend/vercel.json frontend/package.json frontend/CLAUDE.md frontend/app/dev frontend/app/initialize.tsx frontend/app/components/Client/DrawerGallery frontend/app/assets/img/mockEcommerce.png frontend/app/assets/img/mockEcommerce.svg"
"shared-ui:$BASE:frontend/app/components/shared/CountSuffix.tsx frontend/app/components/ui frontend/app/svg/icons/scan-pulse.svg frontend/app/svg/icons/stars.svg frontend/app/constants/panelSizes.ts frontend/app/layout/SideMenu/MenuContent.tsx"
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
  echo "merge order: shared-ui -> {ai-issues -> ux-audit, test-agents -> preferences-agents}"
  echo "harness/prototype-mocks is prototype-only and must never ship."
}

check() {
  fail=0
  for row in "${FEATURES[@]}"; do
    name="${row%%:*}"; rest="${row#*:}"; paths="${rest#*:}"
    br=$(branch_of "$name")
    if ! git rev-parse --verify -q "$br" >/dev/null; then
      printf "%-20s BRANCH MISSING\n" "$name"; fail=1; continue
    fi
    # 1. owned paths identical to the integration branch
    if out=$(git diff --stat "$br" "$INTEGRATION" -- $paths) && [ -z "$out" ]; then
      owned="owned paths match $INTEGRATION"
    else
      owned="OWNED PATHS DIFFER from $INTEGRATION"; fail=1
    fi
    # 2. nothing outside frontend/
    stray=$(git diff --name-only "$BASE" "$br" | grep -v '^frontend/' || true)
    [ -n "$stray" ] && { owned="$owned; TOUCHES NON-FRONTEND: $(echo "$stray" | tr '\n' ' ')"; fail=1; }
    printf "%-20s %s\n" "$name" "$owned"
  done
  echo
  if [ "$fail" -eq 0 ]; then echo "OK: every branch is consistent with $INTEGRATION."
  else echo "PROBLEMS FOUND (see above)."; fi
  return $fail
}

case "${1:-}" in
  ""|-l|--list) list ;;
  -h|--help)    usage ;;
  --check)      check ;;
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
