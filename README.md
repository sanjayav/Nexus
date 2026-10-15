# Nexus (by Aeiforo)

> Sustainability Intelligence Platform — every framework, one dataset,
> auditor-ready.

Nexus produces CSRD, ISSB, GRI, TCFD, CDP, SEC Climate, SB 253/261, and
EU Taxonomy disclosures from a single source of truth, with a
hash-chained audit trail and AI-assisted authoring.

See [`docs/PLATFORM.md`](./docs/PLATFORM.md) for the full feature
outline and [`docs/API.md`](./docs/API.md) for the API reference.

## Quick start

```bash
git clone <repo-url> nexus && cd nexus
npm install
cp .env.example .env.local        # fill in the vars below
npm run dev:all                    # spawns Vite + the local API server
```

Open <http://localhost:5173>. Demo credentials are seeded by `setup`
endpoint on first run.

## Commands

- `npm run dev` — Vite dev server only (SPA, mock API)
- `npm run dev:all` — Vite + local serverless API in one process
- `npm run build` — typecheck + production bundle (writes to `dist/`)
- `npm run preview` — preview the production bundle
- `npm test` — vitest suite (189+ tests)
- `npm run check` — test + build + audit (CI gate)

## Required environment variables

Most env vars are optional — Nexus degrades gracefully and surfaces a
"not configured" affordance in the UI when a key is missing.

| Var | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Neon (or any) Postgres connection string |
| `JWT_SECRET` | Yes | Session signing key (>=32 random bytes) |
| `ANTHROPIC_API_KEY` | No | AI features (extraction, narration, drafting) |
| `RESEND_API_KEY` | No | Email notifications + magic links |
| `WORKOS_API_KEY` / `WORKOS_CLIENT_ID` | No | SAML SSO + SCIM provisioning |
| `LIVEBLOCKS_SECRET_KEY` | No | Realtime multi-user editing in the disclosure UI |
| `VITE_SENTRY_DSN` | No | Browser error tracking + session replay |

When `LIVEBLOCKS_SECRET_KEY` is unset the disclosure editor shows a
"Solo mode" badge — edits stay local and the platform is fully usable
by a single editor at a time.

## Tech stack

- **Framework:** React 18 + TypeScript
- **Bundler:** Vite 5
- **Styling:** Tailwind CSS 3
- **Routing:** React Router DOM v7
- **Charts:** Recharts
- **Icons:** Lucide React
- **Realtime:** Liveblocks
- **AI:** Anthropic Claude Sonnet 4.6
- **Backend:** Vercel serverless functions (Node 20)
- **Database:** Neon Postgres
- **Deployment:** Vercel (`nexus.aeiforo.co.uk`)

## Architecture

- `src/App.tsx` — root router
- `src/components/AppShell.tsx` — main layout shell
- `src/auth/AuthContext.tsx` — auth provider
- `src/pages/` — route pages (Dashboard, Reporting, DisclosureEditor, …)
- `src/lib/` — shared client utilities (api, frameworks, rbac, …)
- `api/` — Vercel serverless functions (typed, zod-validated)
- `docs/` — operator and platform documentation

## License

Proprietary — Aeiforo Ltd. All rights reserved.

For commercial enquiries, contact <hello@aeiforo.co.uk>.
