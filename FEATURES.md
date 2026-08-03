# Features in this fork

This fork carries design prototypes for three agent features. They were built as
one stream of work on `main`; this file is the map that splits them back apart, so
each one can be reviewed, merged and shipped on its own schedule.

**Nothing here touches a service other than the frontend.** Verified:

```
git diff 50a12ac7a..main --name-only | grep -v '^frontend/'   # returns nothing
```

89 files, all under `frontend/`. No `api/`, no `backend/`, no `ee/`, no `tracker/`,
no `scripts/helmcharts/`. Every feature renders mock data, so no branch here can
deploy a service or need a chart bump on its own.

---

## The branches

`50a12ac7a` (2026-06-02, last upstream commit in this fork) is the base of all of
them. Merged together they reproduce `main`; see "Proof" at the bottom.

| Branch | What it is | Owns | Commits |
|---|---|---|---|
| `harness/prototype-mocks` | **Never ship.** No-backend bootstrap so the prototype runs without an API. | `app/dev/`, `vercel.json`, `dev:mock` script, `DrawerGallery`, mock asset | 10 |
| `feature/shared-ui` | Shared atoms the features need. Merge first. | `CountSuffix`, 2 icons, `SVG.tsx` regen, `MenuContent` submenu fix, `MenuItem.tag` | 9 |
| `feature/ai-issues` | AI Issues list, detail, session replay, segments | `Issues/`, `issuesStore.ts`, `DataManagement/Segments/`, `SessionItem.tsx` | 66 |
| `feature/test-agents` | Test Agents: tests, runs, environments, drawers | `Client/KaiSettings/` | 73 |
| `feature/ux-audit` | UX-audit agent: audit list and report | `Audits/` | 8 |
| `feature/preferences-agents` | Preferences > Agents (settings across all agents) | `Client/AgentsPreferences/`, `Audit/AuditView.tsx` | 17 |

Each branch's own paths are byte-identical to `main`, verified per branch with
`git diff <branch> main -- <owned paths>`.

---

## Merge order

The order is not a preference, it is import-level fact:

```
feature/shared-ui
├── feature/ai-issues ──── feature/ux-audit
└── feature/test-agents
                └── feature/preferences-agents (needs ai-issues too)
```

- **`ux-audit` needs `ai-issues`.** `Audits/NewAuditDrawer.tsx` imports
  `Components/Issues/segments/segmentUtils`; `Audits/AuditReport.tsx` imports
  `RowTagChip` and `MOCK_THUMB` from the Issues list. An audit is scoped to a
  segment, so this is a product dependency, not an accident of layout.
- **`preferences-agents` needs both.** It imports `TagDialog` and
  `CriticalRuleFields` from `Issues`, and `useConfirms` and the store from
  `KaiSettings`. It is one settings page reading across every agent, so it is the
  last thing to merge rather than a feature of its own.
- **`ai-issues` and `test-agents` are independent of each other.** Either can ship
  first, or alone.

---

## What each feature needs from you

No branch contains backend work. What it does contain is the shape the UI expects,
in one place per feature, which is the thing to hand to whoever owns the API:

| Feature | The UI's data contract lives in |
|---|---|
| AI Issues | `app/mstore/issuesStore.ts`, `Issues/mockSessionData.ts` |
| Test Agents | `Client/KaiSettings/components/shared/types.ts` + `mockData.ts` |
| UX Audit | `Audits/auditsStore.ts`, `Audits/reportContent.ts` |
| Preferences > Agents | `Client/AgentsPreferences/index.tsx` (local state only) |

---

## Two things that are not net-new surfaces

Everything else in these branches adds new pages. These two edit shipped UI, so
they carry porting and regression risk:

1. **`SessionItem.tsx` (on `feature/ai-issues`) removes `ErrorBars` from session
   rows.** That is the existing Sessions list, for every user, not just the Issues
   page. It is a 9-line deletion. If it should not ship with AI Issues, drop it;
   the rest of the branch does not depend on it.

2. **`feature/shared-ui` touches `components/ui/SVG.tsx`, `MenuContent.tsx` and
   `panelSizes.ts`.** Shared surfaces, so they land wherever shared UI lands,
   including the SaaS repo.

   `SVG.tsx` deserves a warning: the diff is **3357 lines, of which 5 are the two
   new icons**. The rest is `yarn gen:icons` regenerating its own output. Don't
   read that diff. Regenerate it yourself and review the two `.svg` files
   (`scan-pulse.svg`, `stars.svg`) plus `Icons/index.ts` instead.

---

## Merge conflicts you will hit, and the resolution

Every feature adds its own route, nav entry and lazy import. When a second feature
merges, git conflicts where both inserted at the same anchor. There are **8 hunks
across 4 files**, all of them "both sides are right, keep both":

| File | Hunks | What conflicts |
|---|---|---|
| `app/routes.ts` | 2 | route helper, `REQUIRED_SITE_ID_ROUTES` entry |
| `app/PrivateRoutes.tsx` | 3 | lazy import, `enhancedComponents` entry, `<Route>` block |
| `app/layout/data.ts` | 2 | `MENU` enum member, `Agents` group `children` |
| `app/layout/SideMenu/index.tsx` | 1 | `menuRoutes` entry |

**Two of these bite if you resolve mechanically.** I hit both while building this:

- `layout/data.ts` `children`: each side is a complete `children: [...]` line.
  Keeping both literally gives you **two `children` keys in one object**. The
  second silently wins and one nav entry disappears. Merge them into one array.
  Order on `main` is Issues, Tests, Audits.
- `PrivateRoutes.tsx` `<Route>`: each side can be a *fragment* of a JSX element.
  Concatenating produces an element with two `path=` props, which fails the build.
  Close the first element before opening the second.

The other 6 hunks are whole lines and concatenate safely.

---

## Getting one feature's diff, any time

```
./tools/feature-diff.sh                    # list features and their sizes
./tools/feature-diff.sh ai-issues          # that feature's diff, nothing else
./tools/feature-diff.sh ai-issues --stat   # just the file list
./tools/feature-diff.sh --check            # verify every branch still matches main
```

---

## Going forward

One long-lived branch per feature; `main` is the integration and deploy branch.
A change belongs to exactly one feature branch. If a change genuinely spans two,
it belongs in `feature/shared-ui` and both rebase onto it.

There is no commit hook enforcing this. `lefthook.yml` in this repo is entirely
commented out and `yarn lint` is `eslint --fix app; exit 0`, so a blocking hook
would be the only one here and would be a surprise. `./tools/feature-diff.sh
--check` is the check, run when you want it.

---

## Proof the split lost nothing

```
git checkout -B verify/integration harness/prototype-mocks
git merge feature/preferences-agents      # brings shared-ui, ai-issues, test-agents
git merge feature/ux-audit                # 8 hunks, resolved as above
git diff verify/integration main
```

Result: **one blank line** in `PrivateRoutes.tsx`. Every other byte of all 89 files
is identical. The blank line is there because `ux-audit`'s route block is
blank-line-delimited, so its own diff reads as one self-contained block.

`main` before the split is preserved at the tag `backup/main-pre-split`.
