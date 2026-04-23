# Aeiforo Sustainability Reporting Dashboard — Build Status

**As of:** 2026-04-21
**Owner:** sanjay.v@marklytics.co.uk
**Repo:** `/Users/kick/Desktop/Aeiforo/reporting dash`
**Stage:** Working prototype with frontend + backend API + Neon Postgres schema. Deployed on Vercel.

---

## 1. What this project is

A React + TypeScript single-page app for **ESG / sustainability reporting**. It lets an organisation collect emissions data, run GHG calculators, manage disclosure questionnaires (CSRD, TCFD, GRI, etc.), produce AI-assisted reports, and track everything through a workflow with a blockchain-anchored audit trail. RBAC is enforced end-to-end against a Neon Postgres backend.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Frontend framework | React 18 + TypeScript |
| Bundler / dev server | Vite 5 |
| Styling | Tailwind CSS 3, custom "Glass UI / Nexus" design tokens |
| Routing | React Router DOM v7 |
| Charts | Recharts |
| Icons | Lucide React |
| Excel import | `xlsx` (SheetJS) |
| Backend | Vercel serverless functions (`api/*.ts`) |
| Database | Neon Postgres (`@neondatabase/serverless`) |
| Auth | JWT via `jose`, passwords via `bcryptjs` |
| Deployment | Vercel (SPA + serverless, consolidated to 12 functions for Hobby tier) |

---

## 3. Frontend — what's built

### Shell & auth
- [src/App.tsx](src/App.tsx) — Router with `ProtectedRoute` guard, legacy-URL redirects, and a `Placeholder` for unfinished routes.
- [src/components/AppShell.tsx](src/components/AppShell.tsx) — Main layout (sidebar + topbar + content).
- [src/auth/AuthContext.tsx](src/auth/AuthContext.tsx) — Auth context/provider.
- [src/pages/Login.tsx](src/pages/Login.tsx) — Login screen.

### Design system — [src/design-system/components/](src/design-system/components/)
Reusable primitives: `Badge`, `Button`, `Card`, `Input`, `MetricCard`, `ProgressRing`, `Select`, `Sidebar`, `StatusBadge`, `Table`, `Tabs`, `TopBar`.

### Pages — [src/pages/](src/pages/)
**Core modules (wired into router):**
- `Dashboard` — executive overview
- `Calculators` — GHG calculator hub
- `ReportingFrameworks` (served at `/questionnaires`) — framework disclosures
- `DataIngestion` (+ nested routes under `/data/*`) — ingestion hub
- `Workflow` — task/approval workflow
- `Aggregator` — roll-ups
- `ReportPublishing` (`/reports`), `AIReport` (`/reports/ai`)
- `AnomalyDetection` (`/analytics`)
- `OrgStructure`, `UsersRoles` — admin
- `EFLibrary`, `GWPValues` — reference data
- `BlockchainAudit` — audit trail viewer

**Built but not currently linked in router** (available for future wiring):
`AssuranceReview`, `CarbonAccounting`, `CircularSupplyChain`, `EntitySubmissions`, `FrameworkQuestions`, `MeasuredData`, `OrganisationSetup`, `RawSupplierIngestion`, `Reporting`, `ScopeCalculator`, `SupplierData`.

### Shared components
- [src/components/BlockchainProof.tsx](src/components/BlockchainProof.tsx)
- [src/components/ExcelImport.tsx](src/components/ExcelImport.tsx) — `xlsx`-based spreadsheet import
- [src/components/GuidedTour.tsx](src/components/GuidedTour.tsx) — onboarding walkthrough

### Static / seed data — [src/data/](src/data/)
`disclosureFields.ts`, `emissionFactors.ts`, `frameworkData.ts`, `moduleData.ts`, `pttepDemoData.ts`, `pttgcData.ts`.

### Client utilities — [src/lib/](src/lib/)
- `api.ts` — fetch wrapper
- `useApi.ts` — API hook
- `rbac.ts` — client-side permission checks

---

## 4. Backend — Vercel serverless API

Located in [api/](api/). Shared helpers: `_auth.ts` (JWT verify), `_db.ts` (Neon client), `setup.ts` (schema bootstrap).

| Endpoint | File |
|---|---|
| `POST /api/auth/login` | [api/auth/login.ts](api/auth/login.ts) |
| `POST /api/auth/register` | [api/auth/register.ts](api/auth/register.ts) |
| `GET /api/auth/me` | [api/auth/me.ts](api/auth/me.ts) |
| `GET/POST /api/users`, `/api/users/[id]` | [api/users/](api/users/) |
| `GET/POST /api/roles`, `/api/roles/[id]` | [api/roles/](api/roles/) |
| `GET /api/permissions` | [api/permissions/index.ts](api/permissions/index.ts) |
| `GET /api/dashboard` | [api/dashboard/index.ts](api/dashboard/index.ts) |
| `GET/POST /api/workflow` | [api/workflow/index.ts](api/workflow/index.ts) |
| `GET/POST /api/blockchain` | [api/blockchain/index.ts](api/blockchain/index.ts) |

Function count was deliberately consolidated to stay under Vercel Hobby's 12-function limit (commit `fc773ed`).

---

## 5. Database — Neon Postgres

Schema in [schema.sql](schema.sql). Tables:

- `organisations` — multi-tenant root
- `permissions` — (resource, action) pairs; 17 seeded permissions across dashboard / calculators / data / reports / analytics / workflow / audit / admin
- `roles` — per-org roles; 5 seeded system roles: **Platform Admin, Team Lead, Analyst, Viewer, Auditor**
- `role_permissions` — mapping; all five roles have seeded permission sets
- `users` — bcrypt password hashes
- `user_roles` — assignments
- `invitations` — pending / accepted / expired

Seed data includes a demo org (`aeiforo-demo`) and an admin user (`admin@aeiforo.com` / `demo2026`).

---

## 6. Recent milestones (git log)

| Commit | What landed |
|---|---|
| `17f218a` | Full backend + enterprise API layer on Neon Postgres |
| `fc773ed` | Consolidated API to 12 functions for Vercel Hobby limit |
| `06270fe` | ESM-compatible imports for bcryptjs + crypto |
| `7923489` | Removed `"type": "module"` to fix serverless `ERR_MODULE_NOT_FOUND` |
| `8d55962` | Added `.js` extensions to ESM relative imports for Node 24 |

The recent fix stream has been about getting the serverless functions to load cleanly on Vercel under Node 24 ESM rules.

---

## 7. Environment & ops

- `.env` holds local secrets (Neon URL, JWT secret) — not committed.
- [vercel.json](vercel.json) — SPA rewrite + API routing.
- `npm run dev` — Vite dev server (currently serving on `http://localhost:5173/`).
- `npm run build` — `tsc` typecheck + Vite production build.

---

## 8. Known gaps / next candidates

1. **Unlinked pages** — 11 page components exist but aren't in the router (see §3). Decide which to wire vs delete.
2. **Placeholder routes** — `/calculators/:moduleId` and `/settings` still render the 🚧 placeholder.
3. **API surface** — no endpoints yet for: emissions data CRUD, framework questionnaire responses, report generation, EF library, GWP values. Frontend for these currently relies on static data in `src/data/`.
4. **Client RBAC vs server RBAC** — `src/lib/rbac.ts` exists; confirm every sensitive API route enforces the same checks server-side.
5. **Tests** — no test suite configured.
6. **Docs drift** — older docs (`ARCHITECTURE.md`, `IMPLEMENTATION_SUMMARY.md`, `USER_GUIDE.md`, `QUICK_START.md`) date from Nov 2025 and predate the backend; this file supersedes them for current status.
