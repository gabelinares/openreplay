# Features in this fork

This fork carries design prototypes for three agent features. They were built as
one stream of work on `main`; this file is the map that splits them back apart, so
each one can be reviewed, merged and shipped on its own schedule.

**No feature branch touches a service other than the frontend.** Verified:

```
git diff 50a12ac7a..main --name-only -- . ':(exclude)frontend' ':(exclude)tools' ':(exclude)FEATURES.md'
# returns nothing
```

89 files under `frontend/`, plus this file and `tools/`, which exist on `main` only
and are not part of any feature. No `api/`, no `backend/`, no `ee/`, no `tracker/`,
no `scripts/helmcharts/`. Every feature renders mock data, so no branch here can
deploy a service or need a chart bump on its own.

**And no feature branch is shippable as it stands.** They render mock data; they are
review and merge units, not release units. What "ship AI Issues alone" means here is
"merge and review it alone, without dragging the other two into the diff".

---

## The branches

`50a12ac7a` (2026-06-02, last upstream commit in this fork) is the base of all of
them. Merged together they reproduce `main`; see "Proof" at the bottom.

| Branch | What it is | Owns | Commits |
|---|---|---|---|
| `harness/prototype-mocks` | **Never ship.** No-backend bootstrap so the prototype runs without an API. Sits on `ai-issues`, because seeding a session list is seeding Issues' data. | `app/dev/mockBootstrap.ts`, `vercel.json`, `dev:mock` script, `DrawerGallery`, mock asset | 8 |
| `feature/shared-ui` | Shared atoms the features need. Merge first. | `CountSuffix`, 2 icons, `SVG.tsx` regen, `MenuContent` submenu fix, `MenuItem.tag` | 10 |
| `feature/ai-issues` | AI Issues list, detail, session replay, segments | `Issues/`, `issuesStore.ts`, `DataManagement/Segments/`, `SessionItem.tsx` | 68 |
| `feature/test-agents` | Test Agents: tests, runs, environments, drawers | `Client/KaiSettings/` | 73 |
| `feature/ux-audit` | UX-audit agent: audit list and report | `Audits/` | 8 |
| `feature/preferences-agents` | Preferences > Agents (settings across all agents) | `Client/AgentsPreferences/`, `Audit/AuditView.tsx` | 17 |

Each branch's own paths are byte-identical to `main`, verified per branch with
`./tools/feature-diff.sh --check`.

### Every branch resolves its own imports

`./tools/feature-diff.sh --check` verifies, per branch, that every `App/...` and
`Components/...` import resolves inside that branch. All six pass with no exceptions.

This was not true at first. `app/dev/mockSessions.ts` held the mock session pool, and
AI Issues read it from three files while the harness bootstrap read it from a fourth,
so AI Issues could not resolve without the branch that must never ship. The pool now
lives at `Issues/mockSessions.ts`: the feature owns its own fixtures, and the harness
reads the pool from Issues, which is why the harness sits on `ai-issues` rather than
beside it. Seeding a session list is seeding Issues' data, and the harness exists to
run the whole prototype, so that direction is the honest one.

---

## Merge order

The order is not a preference, it is import-level fact:

```
feature/shared-ui
├── feature/ai-issues ──┬── feature/ux-audit
│                       └── harness/prototype-mocks   (never ship)
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

## Four things that are not net-new surfaces

Everything else in these branches adds new pages. These four edit shipped UI, so
they carry porting and regression risk:

1. **`SessionItem.tsx` (on `feature/ai-issues`) removes `ErrorBars` from session
   rows.** That is the existing Sessions list, for every user, not just the Issues
   page. It is a 9-line deletion. If it should not ship with AI Issues, drop it;
   the rest of the branch does not depend on it.

2. **`feature/shared-ui` touches `components/ui/SVG.tsx`, `MenuContent.tsx` and
   `panelSizes.ts`.** Shared surfaces, so they land wherever shared UI lands,
   including the SaaS repo.

   `SVG.tsx` was a 3357-line diff for two icons: `scripts/icons.js` writes raw
   generator output on top of a prettier-formatted file. Running prettier on it
   brings the diff to 154 lines, which is what the branch now carries. `yarn build`
   regenerates all three generated files before parcel runs, so nothing about the
   shipped bundle depends on their committed form.

3. **`DataManagement/Segments/{index,SegmentsList}.tsx` (on `feature/ai-issues`),
   +186/-62 to a shipped page.** The tab split is gone and create/edit moved into
   the Issues drawer, which leaves the old full-page segment editor routed but
   unreachable. Confirm that is deliberate or delete the dead route.

4. **`Client/Audit/AuditView/AuditView.tsx` (on `feature/preferences-agents`),
   +33/-42 to the shipped audit-trail settings page.** Header-grammar change only,
   but it is a shipped page in Preferences, and it has nothing to do with the
   UX-audit agent despite the similar name.

---

## Merge conflicts you will hit, and the resolution

Every feature adds its own route, nav entry and lazy import. When a second feature
merges, git conflicts where both inserted at the same anchor. How many depends on
which path you take: merging `test-agents` then `ai-issues` gives **3 hunks across
2 files**; the full path (harness, then `preferences-agents`, then `ux-audit`) gives
**8 hunks across 4 files**. All of them are "both sides are right, keep both":

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
  Concatenating produces an element with two `path=` props. Close the first element
  before opening the second.

The other hunks are whole lines and concatenate safely.

**Neither trap fails the build.** Babel accepts a duplicate JSX attribute, parcel
does not typecheck, `yarn tsc` is watch mode rather than a CI gate, and `yarn lint`
ends in `exit 0`. So a mechanical resolution gives you a nav entry and a route that
have silently disappeared, with a green build. Check the nav after any merge of a
second feature.

---

## Reviewing these as PRs

`main` already contains every feature, so a PR from a feature branch into `main` shows
an empty diff. The PR base is `review-base` instead, a branch pinned at `50a12ac7a`,
and the stack is expressed as stacked PRs: `shared-ui` targets `review-base`, each
feature targets `shared-ui`, `ux-audit` targets `ai-issues`, `preferences-agents`
targets `test-agents`. That way each PR's diff is only that feature's own work.

If you rebase a feature branch, rebase it onto its parent's *tip*. A cherry-picked
copy of a parent commit strands the merge base, and GitHub then shows the parent's
churn inside the child's PR: that is how ~1200 lines of icon reformatting first
appeared in the Test Agents PR.

## Getting one feature's diff, any time

```
./tools/feature-diff.sh                    # list features and their sizes
./tools/feature-diff.sh ai-issues          # that feature's diff, nothing else
./tools/feature-diff.sh ai-issues --stat   # just the file list
./tools/feature-diff.sh --check            # verify every branch still matches main
```

---

## Where these branches point

`main` here is **this fork's** integration and deploy branch. It is not upstream's.
Upstream integrates on `dev`; upstream `main` is the release branch that
`update-tag.yaml` moves the release tag into. `50a12ac7a`, the base of every branch
here, is an upstream *release* commit from 2026-06-02, and `upstream/dev` has never
been fetched into this clone, so the real drift is unmeasured.

Practically: PRs on this fork are review artifacts, they never target upstream. When
work lands for real it goes to `dev`.

**Do not merge `upstream/dev` into these branches yet.** Measured 2026-08-03 with
`./tools/feature-diff.sh --drift`: 257 upstream commits since the base, 72 of them
touching `frontend/`, 320 upstream files changed against our 89. The overlap is
**12 files**, and every one of them is shell wiring or harness config:

```
.env.sample  .gitignore  package.json  initialize.tsx
routes.ts  PrivateRoutes.tsx  layout/data.ts  layout/SideMenu/index.tsx
utils/routeUtils.ts  components/Client/Client.tsx
components/ui/SVG.tsx  components/ui/Icons/index.ts
```

Not one feature directory is in that list. `Issues/`, `KaiSettings/`, `Audits/`,
`AgentsPreferences/`, `DataManagement/Segments/` and `SessionItem.tsx` are untouched
upstream, so roughly 18,000 lines of feature code cannot rot. Merging now would mean
resolving the same 12 wiring files six times and putting 320 files of upstream churn
into every PR diff, which destroys the per-feature diffs this split exists to produce.

Merge upstream **once, into whichever feature is actually being taken**, at the moment
it is taken, against `dev` as it is then. **Merge, never rebase**: a 6-line upstream
addition to `SVG.tsx` produces a ~510-line 3-way conflict region, and rebasing replays
it on every commit that touched the file. Better still for that one file, resolve it by
running `yarn gen:icons && npx prettier --write app/components/ui` rather than merging
hunks, since it is generated output. Re-measure with `--drift` whenever you want the
current number.

## Still open, and not mine to decide

1. **Order, as far as it is decided.** Audits ships **last** (Gabriel, 2026-08-03).
   Issues versus Tests is still open, and it is the one input the edition gating needs.
2. **No edition gating.** Every comparable nav group at base carries
   `hidden: menuHidden.X` from `App/utils/split-utils` (`kai`, `vault`, `lexicon`,
   `segments`). The new `Agents` group carries none, so Issues, Tests and Audits
   appear in OSS and EE builds where the backend does not exist. Needs
   `menuHidden.agents` plus one key per child, and a decision about which edition
   each feature goes to first.
3. **`sessionReplay.webm` is 7.6 MB and bundled**, via `import url from
   'url:./sessionReplay.webm'` in `Issues/sessionVideo.ts`. Prototype content in a
   production bundle. Serve it from a URL or drop it.
4. **The `Agents` nav group is co-owned.** It is defined identically on `ai-issues`
   and `test-agents`, which is why `layout/data.ts` conflicts and why reverting a
   feature is order-dependent: whichever merged first owns the group, so reverting it
   takes the group and the other features' nav entries with it. Moving the group
   (and `MENU.AGENTS`) to `feature/shared-ui` reduces the conflict to one line and
   makes revert order-independent.
5. **`IS_MOCK` leaks outside the harness.** `process.env.MOCK === '1'` appears in
   `DataManagement/Segments/index.tsx` on `feature/ai-issues`, used at six sites.
   Everywhere else mock branching is confined to `app/dev/`.
6. **No test covers any of this.** 148 commits added zero test files, and
   `yarn test:ci` is the only real CI gate on `frontend/**`. `issuesStore.ts` is 1266
   lines, constructed eagerly in `RootStore` for every user in every edition, with no
   unit test, while `analyticsStore`, `sessionStore` and `searchStore` all have one.
7. **26 stale branches on `origin`** (`feat/*`, `fix/*`, `preview/*`, `polish/*`) are
   all fully contained in `main` and now redundant with the six.

## Going forward

One long-lived branch per feature; `main` is this fork's integration and deploy
branch.
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

## The commit subjects on these branches are not authoritative

The split replayed each original commit path-filtered onto the branch that owns
those paths, keeping the original subject. Where a commit touched two features, each
branch got the part that belongs to it, under the same subject. So there are commits
whose subject describes work that is mostly on another branch:
`feat(issues): sessions data, detail gallery, and full session player` on
`feature/shared-ui` contains only the `SVG.tsx` regen, and
`feat(agents): Preferences > Agents becomes one tab per agent` on `feature/ux-audit`
contains ten lines of `AuditsList.tsx`.

Read the diffs, not the log. The decision trail (which review, which date, Mehdi or
Gabriel) is in `backup/main-pre-split`, where the commits are whole. If these branches
get squash-merged, which is how this repo ships, none of it survives anyway, so put
the provenance in the PR body.
