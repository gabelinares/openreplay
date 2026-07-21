# OpenReplay frontend — Test Agents redesign demo

This branch (`feat/test-agents-redesign`) redesigns the **Test Agents** ("Kai")
preferences page as a mock-data prototype inside the real OpenReplay frontend.

It reuses the no-login mock environment built for the AI Issues prototype
(`mockBootstrap`, `MOCK=1` gating, `dev:mock`, Vercel deploy config). The Test Agents
UI was transplanted from upstream's `kai-testing-ui` branch; it runs entirely on mock
data (`KaiSettings/components/shared/mockData.ts`) — no backend.

This is a **design-only** workstream: change the UI/design, keep it on mock data.
Do not wire real APIs.

## Running the prototype (no login, mock data)

This worktree runs on **port 3334** (the Issues worktree uses 3333):

```bash
MOCK=1 ./node_modules/.bin/parcel app/index.html --port 3334
# or, via the Issues default port: yarn dev:mock
```

Then open: **http://localhost:3334/client/test-agents**

- `MOCK=1` triggers `app/dev/mockBootstrap.ts` (gated in `app/initialize.tsx`), which
  seeds a fake user + project into the MobX stores so the app chrome and preferences
  pages render with **no backend and no login**.
- Test Agents data is mock/in-memory from `KaiSettings/components/shared/mockData.ts`.
- Console errors about JWT / property filters are the expected no-backend noise.

## Key files

- `app/components/Client/KaiSettings/` — the Test Agents page (index + tabs)
  - `index.tsx` — `PageTitle('Test Agents')` + tabs (Auto-Testing Settings / Test Runs)
  - `components/` — `SettingsTab`, `RunsTab`, `RunRow`, `Environments`, `TestCaseContent`
  - `components/shared/mockData.ts` — mock data + types (`MOCK_RUNS`, environments, test cases)
- Wiring (kept minimal, transplanted from `kai-testing-ui`):
  - `app/utils/routeUtils.ts` — `CLIENT_TABS.TEST_AGENTS = 'test-agents'`
  - `app/components/Client/Client.tsx` — `case CLIENT_TABS.TEST_AGENTS: return <KaiSettings />`
  - `app/layout/data.ts` — `PREFERENCES_MENU.TEST_AGENTS` nav entry (always visible here)
- `app/dev/mockBootstrap.ts` / `app/initialize.tsx` — the no-backend auth/store seed

## Deploying (two environments since 2026-07-20)

Two Vercel projects, same repo, both built from `frontend/vercel.json` (MOCK build).
No git auto-deploy on either — deploys are always manual:

- **openreplay-main.vercel.app** — CANONICAL (Nikita implements from this).
  Deploy ONLY from `main`, only after a PR merges: `yarn deploy:main`
- **openreplay-design.vercel.app** — WIP (Mehdi reviews here).
  Deploy the feature branch under review, as often as needed: `yarn deploy:design`
  (targets the design project via VERCEL_PROJECT_ID override; the `.vercel/` link
  stays pointed at openreplay-main)

Flow: feature branch → `yarn deploy:design` → Mehdi approves → merge PR →
`yarn deploy:main`. No long-lived design branch — the feature branch itself is
the WIP source; throwaway integration branch only if two batches must demo together.

## UI consistency rules (Gabriel, 2026-07-21 — non-negotiable)

The agent features graduate into a standalone product (Wrangler/Melanade), so
everything must be built as reusable, theme-driven components:

1. **NEVER call antd statics for themed UI** — `Modal.confirm`, `Modal.info`,
   etc. mount OUTSIDE the `ConfigProvider` in `app/initialize.tsx` and silently
   drop the app theme (corner radius, fonts, colors). Always use
   `App.useApp()`'s `modal` (the tree is wrapped in antd `<App>`).
2. **One dialog component, not per-callsite markup.** Confirms live in
   `KaiSettings/components/shared/confirms.tsx` (`useConfirms()`); add new
   confirm flavors THERE. The look reference is the Issues Hide modal: no
   exclamation icon, default width/position, subject quoted in a gray body line.
3. **Before building any new UI element, look for the existing component**
   (in Kai shared/, Issues, or the app's UI kit) and reuse or extend it.
   A lookalike rebuilt inline is a bug even when it renders identically today.
