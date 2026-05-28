# Static Analysis Audit — 2026-05-29

## Executive summary
- 0 critical findings
- 8 high findings
- 11 medium findings
- ~12 informational

Headline must-fix items:
1. `xlsx` (SheetJS) v0.18.5 has prototype pollution + ReDoS, no fixed version available on npm registry — switch to CDN build or replace.
2. `@vercel/node` 5.7.2 transitive chain pulls in vulnerable `undici`, `path-to-regexp`, `glob`, `lodash`, `minimatch`, `picomatch` — bump to 5.8.8.
3. `api/setup.ts` is fully unauthenticated and runs DDL + seed inserts on every POST — anyone who knows the URL can repeatedly hit it.

## 1. Dependency security
`npm audit` reports 20 advisories: 0 critical / 12 high / 8 moderate.

| Package | Severity | Issue | Direct? | Recommendation |
|---|---|---|---|---|
| xlsx | high | Prototype Pollution (GHSA-4r6h-8v6p-xvw6) + ReDoS (GHSA-5pgg-2g8v-p4x9) | direct prod | No npm fix — replace with `exceljs` or load SheetJS CDN build |
| @vercel/node | high (transitive) | undici / path-to-regexp / minimatch | direct dev | Bump 5.7.2 → 5.8.8 |
| undici | high | 7 CVEs incl. CRLF injection (GHSA-4992-7rv2-5pvq), insufficient randomness (GHSA-c76h-2ccp-4975) | transitive | Pulled by @vercel/node — fixed by @vercel/node bump |
| react-router / react-router-dom | high/moderate | CSRF (GHSA-h5cw-625j-3rxh), open-redirect XSS (GHSA-2w69-qvjg-hvjx), unexpected external redirect (GHSA-9jcx-v3wj-wh4m) | direct prod | Bump 7.9.5 → 7.16.0 |
| rollup | high | Arbitrary File Write via Path Traversal (GHSA-mw96-cpmx-2vgc) | transitive (vite) | Bump vite |
| lodash | high | Prototype Pollution + Code Injection in `_.template` | transitive | Bump @vercel/node |
| glob | high | Command injection in CLI (GHSA-5j98-mcp5-4vw2) — CLI only, low real impact | transitive | Bump @vercel/node |
| picomatch | high | ReDoS in extglob quantifiers | transitive | Bump @vercel/node |
| minimatch | high | Multiple ReDoS variants | transitive | Bump @vercel/node |
| path-to-regexp | high | Backtracking regexes | transitive | Bump @vercel/node |
| vite | moderate | Path traversal in optimised-deps `.map` handling — dev-server only | direct dev | Bump 5.4.21 → 5.4.latest |
| postcss | moderate | XSS via unescaped `</style>` (GHSA-qx2v-qp2m-jg93) | direct dev | Bump 8.5.6 → 8.5.15 |
| ajv | moderate | ReDoS in `$data` | transitive | Bump @vercel/node |
| brace-expansion | moderate | DoS / memory exhaustion | transitive | Bump @vercel/node |
| esbuild | moderate | Dev-server can be read by any website | transitive (vite) | Bump vite |
| smol-toml | moderate | DoS on commented lines | transitive | Bump @vercel/node |

Only `xlsx` has no upstream fix.

## 2. Outdated dependencies
`npm outdated` reports 21 packages behind. Notable major bumps available but not blocking:

| Package | Current | Latest | Type | Notes |
|---|---|---|---|---|
| @react-pdf/renderer | 3.4.5 | 4.5.1 | prod | Major — breaks PDF layout API |
| @types/react | 18.3.26 | 19.2.15 | dev | Match React major |
| react / react-dom | 18.3.1 | 19.2.6 | prod | React 19 migration |
| recharts | 2.15.4 | 3.8.1 | prod | Major API rewrite |
| @vitejs/plugin-react | 4.7.0 | 6.0.2 | dev | Requires Vite 7 |
| vite | 5.4.21 | 8.0.14 | dev | Major (rolls esbuild + rollup fixes) |
| concurrently | 9.2.1 | 10.0.0 | dev | Minor breakage risk |
| tailwindcss | 3.4.18 | 4.3.0 | dev | Major — CSS-first config |
| typescript | 5.9.3 | 6.0.3 | dev | Major |
| lucide-react | 0.294.0 | 1.17.0 | prod | Major (renamed icons) |
| react-router-dom | 7.9.5 | 7.16.0 | prod | Minor — fixes CVEs (see §1) |
| @vercel/node | 5.7.2 | 5.8.8 | dev | Minor — fixes CVE chain |
| postcss | 8.5.6 | 8.5.15 | dev | Patch — fixes CVE |

## 3. ESLint
No `.eslintrc*` or `eslint.config.*` file in the repo. `package.json` has no `lint` script and no `eslint` dep installed.

- Total ESLint errors: **N/A — eslint not configured**
- Recommendation: add a minimal `eslint.config.js` with `@typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react`. Several files already contain `// eslint-disable-next-line …` directives (see §9) referencing rules that nothing currently enforces, so the dev intent exists.

## 4. Dead code
`npx ts-prune` reports 206 candidate unused exports.

After filtering the explicitly-orphan files listed in the request (`pttgc*.ts`, `_pttgcSeed.ts`, `brand-pttgc.ts`, `seed-*.ts`):

Top live-codebase candidates (file:line):
- `src/auth/IfCan.tsx:13` — `IfCan` exported but unreferenced.
- `src/components/GuidedTour.tsx:51` — default export unused (component appears not to be mounted).
- `src/components/MeshBackground.tsx:8,116` — `default` + `useSpotlight` both unused.
- `src/components/tilt.ts:10,48` — `useTilt`, `useSpotlight` unused.
- `src/components/motion.ts:50` — `liftOnHover` unused.
- `src/data/demoData.ts:220-1036` — 13 top-level exports (`emissionsHistory`, `sbtiTrajectory`, `blockchainRecords`, `suppliers`, `anomalies`, `quarterly2026`, `yoyComparison`, `frameworkStatuses`, `cdpSections`, `tcfdSections`, `griDisclosures`, `workflowItems`, `aiReportText`, `complianceStatus`, `kpiSummary`). The static demo fixture appears superseded by the API layer.
- `src/data/demoHistorical.ts:34,788,836,841` — `DEMO_GROUP_COMPANIES`, `DEMO_HEADLINES`, `getHistorical`, `getByCapital`.
- `src/data/disclosureFields.ts:332,342` — `getFieldsForDisclosure`, `DEMO_AUTO_VALUES`.
- `src/data/frameworkData.ts:42,52,65,653` — `GROUP_THEME_COLORS`, `MODULE_TAG_COLORS`, `FRAMEWORKS`, `INTEROP_MAP`.
- `src/data/emissionFactors.ts:95,110,133,151,168,188,192` — 7 unused factor tables + helpers (`HEAT_FACTORS`, `SPEND_FACTORS`, `TRANSPORT_FACTORS`, `WASTE_FACTORS`, `TRAVEL_FACTORS`, `calcCO2e`, `kgToTonnes`).
- `src/lib/api.ts` lines 261, 295, 322, 404, 439, 456 — `activityData`, `dashboard`, `workflow`, `reports`, `analytics`, `disclosures` modules flagged as unused (ts-prune false positive risk — verify before deleting; some are re-exported through the orgStore facade).
- `src/lib/rbac.ts:201` — `canAccessRoute`.
- `src/lib/useApi.ts:46` — `useMutation`.
- `src/lib/useOrgData.ts:54` — `useMyAssignments`.
- `src/lib/rollup.ts:107` — `buildReportRows`.
- `src/lib/useOrgBrand.ts:58` — `clearOrgBrandCache`.
- `src/design-system/index.ts:1-10` — every barrel-exported component flagged (likely false positive from ts-prune; verify).
- `src/design-system/components/Skeleton.tsx:8` — default unused.
- `src/calculators/scope3/index.ts:92,146` — `findScope3Calculator`, `makeBrowserEFContext`.
- `src/reports/spdTemplate.ts:` types `Capital`, `TemplateRow`, `PublishReadiness`.
- Page defaults unused (route stub leftovers): `AssuranceReview.tsx:26`, `CarbonAccounting.tsx:22`, `DataEntryPicker.tsx:21`, `FrameworkQuestions.tsx:94`, `ReportingFrameworks.tsx:52`, `ScopeCalculator.tsx:110` — verify against `App.tsx` route table.

api/ dead code: ts-prune sees api/ only through tsconfig include of `src/`, so api/ is not scanned (tsconfig only includes `src`). To analyse api/ a separate tsconfig.api.json would be needed.

## 5. Bundle composition
Top assets in `dist/assets/` from the last build:

| Asset | Size | Notes |
|---|---|---|
| spline-*.js | 4.4 MB | Lazy-loaded — 3D scene viewer. Fine if route-gated. |
| recharts-*.js | 423 KB | Charts. Shared by Dashboard + Analytics. |
| xlsx-*.js | 415 KB | Excel import. Route-loaded by DataIngestion. |
| index-*.js | 373 KB | **Main entry — large.** |
| react-vendor-*.js | 172 KB | React + Router + scheduler. |
| DataIngestion-*.js | 94 KB | Route chunk. |
| AIReport-*.js | 80 KB | Route chunk (includes DOMPurify + marked). |
| ReportPublishing-*.js | 59 KB | Route chunk. |
| AssignmentManager-*.js | 50 KB | Route chunk. |

Findings:
- The 373 KB `index` chunk is uncomfortably large for a shell. Vite manual-chunks already split spline/pdf/recharts/react. Worth verifying via `vite-bundle-visualizer` what else is being eagerly imported into index — candidates: `framer-motion`, `marked`, `qrcode`, `dompurify`, `lucide-react` icon barrel.
- No bundle-visualiser plugin installed; bundle inspection was filesystem-only.
- `spline` 4.4 MB is the largest single dep — confirm it's behind a lazy route boundary (it is; only one route imports it).

## 6. Security pattern audit
- **dangerouslySetInnerHTML uses:** 1 — `src/pages/AIReport.tsx:349`. Sanitized by `DOMPurify.sanitize` (line 150) before render. **OK.**
- **`eval(` / `new Function(`:** 0 occurrences in `src/` and `api/`. **Clean.**
- **SQL injection candidates:** 0. All queries use neon `sql\`…\`` tagged templates; no string concatenation found. **Clean.**
- **Unauthenticated mutation endpoints:** 1 unintended.
  - `api/setup.ts` — POST runs ~63 `CREATE TABLE IF NOT EXISTS` + many INSERTs, **no auth check** (only CORS). Idempotent but allows anyone to DoS the DB with repeated calls and to seed test data. Either gate behind `SETUP_TOKEN` env var, or require `Authorization: Bearer …` with a platform-admin role.
  - Intended public endpoints (confirmed not a finding): `api/auth/login.ts`, `register.ts`, `forgot-password.ts`, `reset-password.ts`, `auth/mfa/verify.ts` (uses purpose-token), `auth/sso/initiate.ts` (signs state nonce), `auth/sso/callback.ts` (verifies state), `health.ts`, `materiality/{iro,stakeholder,finalize}.ts` (re-route through authenticated `index.ts`), and `org.ts` verify-report mode (intentional public token-check at line 87).
- **Hard-coded secrets:** 0 matches for `sk_…`, `pk_live_…`, `AIza…`, `AKIA…` in src/, api/, scripts/. **Clean.**
- **localStorage sensitive data:** `aeiforo_token` (JWT) + `aeiforo_auth_user` (user profile). Acceptable for the SPA pattern; only flag is that token lives in localStorage rather than httpOnly cookie (XSS theft risk). Other localStorage keys are UI-state only.
- **CSRF:** All state-changing endpoints take JWT via `Authorization` header, no cookie auth — CSRF not applicable.

## 7. React anti-patterns
- **useEffect missing-deps suppressions:** 8 — `// eslint-disable-next-line react-hooks/exhaustive-deps` at:
  - `src/components/NotificationsBell.tsx:111`
  - `src/lib/useApi.ts:33`
  - `src/pages/Notifications.tsx:100`
  - `src/pages/MyTasks.tsx:75,479`
  - `src/pages/AssignmentManager.tsx:75`
  - `src/pages/DataEntry.tsx:144`
  Likely intentional but worth re-auditing each.
- **`useEffect` with object/array literal deps:** none detected.
- **`useEffect(async () => …)`:** none.
- **`useState` setters in render bodies:** none found outside event handlers / effects.
- **Direct DOM mutation via refs without cleanup:** none detected.
- **onClick on non-interactive `<div>` / `<span>`:** 30+ matches. Vast majority are modal-backdrop click-to-close patterns (`<div className="fixed inset-0…" onClick={onClose}>`). Acceptable UX pattern but technically a11y warning — would fail `jsx-a11y/click-events-have-key-events`. Sample locations:
  - `src/components/BlockchainProof.tsx:43`
  - `src/components/ExcelImport.tsx:163`
  - `src/components/GuidedTour.tsx:82`
  - `src/pages/UsersRoles.tsx:597,710,777,840`
  - `src/pages/ClimateTargets.tsx:368,571`
  - `src/pages/ReportPublishing.tsx:768`
  - `src/pages/AssignmentManager.tsx:394,1555`
  - `src/pages/EFLibrary.tsx:370`
  - `src/pages/Scope3Calculators.tsx:343`
  - `src/pages/SustainabilityPerformanceReport.tsx:306`
  - `src/pages/EntitySubmissions.tsx:279`
  - `src/pages/OrgStructure.tsx:528,562`
  - `src/design-system/components/Sidebar.tsx` (mobile drawer backdrop)
  Add `role="button"` + `onKeyDown` Esc handler, or convert to `<button>` with absolute positioning.

## 8. Accessibility
- **`<img>` without `alt`:** 0. **Clean.**
- **`<input>` without associated label:** the codebase has 19 `<input>` but only 9 `htmlFor=` references. Spot check shows most inputs are visually paired with a sibling `<label>` (not `htmlFor`) or use `placeholder` only — these would fail axe `label` rule. Highest-value pages to fix:
  - `src/pages/Materiality.tsx:255,405,407,409` — `placeholder=…` only.
  - `src/pages/ContentIndex.tsx:125,139` — search + checkbox unlabelled.
  - `src/pages/ReportingPeriods.tsx:201,205,211,215,220` — 5 inputs in a form, no `htmlFor`.
  - `src/pages/OrgOnboarding.tsx:469,470,472` — short-form inputs.
- **Icon-only `<button>` missing `aria-label`:** Several modal-close `<X />` buttons rely on visual icon only:
  - `src/components/BlockchainProof.tsx:56`
  - `src/components/ResetWorkspaceButton.tsx:85`
  - `src/components/ExcelImport.tsx:192`
  - `src/components/AnomalyFeed.tsx:94` (has `title=` but no `aria-label`)
  Add `aria-label="Close"` etc.
- **Modal backdrop click handlers:** see §7.

## 9. Type safety
- **`as any` / `: any`:** 14 occurrences in src/ + api/ (excluding the harmless docstring at `src/pages/BlockchainAudit.tsx:224` and English copy at `src/pages/UsersRoles.tsx:352`):
  - `src/components/HistoricalReferencePanel.tsx:109` — `icon: any` in inline type.
  - `src/components/HistoricalReferencePanel.tsx:218` — Recharts formatter `(v: any) =>`.
  - `src/lib/sentry.ts:52` — `integrations as any` (justified — Sentry's SDK types).
  - `src/pages/MyTasks.tsx:486,487` — `assignment.used_mode as any`.
  - `src/pages/AssignmentManager.tsx:39,233,599` — three casts.
  - `src/design-system/components/Sidebar.tsx:549` — anomaly summary fallback cast.
  - `api/_reportGenerator.ts:223` — `pdf(React.createElement(ReportDocument, {input}) as any)` (react-pdf type friction).
  - `api/org.ts:1511` — `sql as any` when passing neon sql into assembler.
- **`@ts-ignore` / `@ts-expect-error`:** 0. **Clean.**
- **`eslint-disable`:** 26 occurrences — mostly `no-console` (intentional logging) and `react-hooks/exhaustive-deps` (see §7). Two `@typescript-eslint/no-explicit-any` in `src/lib/sentry.ts`.

## 10. Configuration
- **vercel.json:** Only contains SPA rewrites. No `functions` block — every API route uses default Vercel settings (10s max duration on Hobby, 1024 MB memory, single region). Recommend explicit:
  - `functions["api/admin/export.ts"].maxDuration: 60` (zip export can be heavy)
  - `functions["api/reports/[id]/ixbrl.ts"].maxDuration: 30`
  - `functions["api/setup.ts"].maxDuration: 60`
  - Pin `regions: ["iad1"]` or whatever Neon region you target.
- **tsconfig.json:** `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `noFallthroughCasesInSwitch: true`. Missing: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`. Consider enabling these as a follow-up. Also `tsconfig.json` only includes `src/` — `api/` is type-checked via `vite build`'s `tsc` step only against src; api/ types may drift.
- **.env.local.example:** Present, documents `DATABASE_URL`, `JWT_SECRET`, `ALLOWED_ORIGINS`, `VITE_DEMO_PASSWORD`, `VERCEL_API_URL`. **Missing documented env vars** that are referenced in code:
  - `DATABASE_URL_EU`, `DATABASE_URL_APAC` (referenced in `api/_db.ts`)
  - `RESEND_API_KEY` (`api/_email.ts`, `api/health.ts`)
  - `WORKOS_API_KEY`, `WORKOS_CLIENT_ID` (`api/health.ts`)
  - `ANTHROPIC_API_KEY` (`api/health.ts`, `api/ai/draft.ts`)
  - `VITE_SENTRY_DSN` / `SENTRY_DSN` (`src/lib/sentry.ts`)
  - `MFA_ENCRYPTION_KEY` (referenced by `api/_crypto.ts`)
- **.gitignore:** Covers `.env*` family, `node_modules`, `dist`, `dist-ssr`, editor files. **Missing:**
  - `playwright-report/`
  - `test-results/`
  - `coverage/`
  - `.vercel/`
  - `*.tsbuildinfo`

## Top 10 fix list (prioritised)
1. **Gate or remove `api/setup.ts` public access** — add a `SETUP_TOKEN` env-var check, or require admin JWT. Currently anyone on the internet can hammer DDL/INSERTs.
2. **Replace `xlsx` (SheetJS)** — no npm fix available for the two high CVEs; swap to `exceljs` or pin the CDN build.
3. **Bump `@vercel/node` 5.7.2 → 5.8.8** — closes 7 transitive high-severity advisories (undici, glob, lodash, path-to-regexp, minimatch, picomatch, ajv).
4. **Bump `react-router-dom` 7.9.5 → 7.16.0** — closes 4 advisories incl. open-redirect XSS that's directly user-reachable.
5. **Bump `vite` patch + `postcss` patch** — covers rollup path-traversal and postcss XSS.
6. **Add an ESLint config** (`@typescript-eslint`, `react-hooks`, `jsx-a11y`) — `// eslint-disable` directives already exist in 26 places but nothing enforces them.
7. **Document missing env vars in `.env.local.example`** — `RESEND_API_KEY`, `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `ANTHROPIC_API_KEY`, `VITE_SENTRY_DSN`, `MFA_ENCRYPTION_KEY`, `DATABASE_URL_EU/APAC`, `SETUP_TOKEN` (after #1).
8. **Add `vercel.json` `functions` config** for `admin/export.ts`, `reports/[id]/ixbrl.ts`, `setup.ts` (raise maxDuration), pin region.
9. **Move JWT out of localStorage** to httpOnly cookie OR document the XSS-theft risk acceptance; the only XSS sink today (`AIReport`) is sanitised but a future regression would exfiltrate sessions.
10. **Delete confirmed dead exports in `src/data/demoData.ts`, `src/data/emissionFactors.ts`, `src/data/frameworkData.ts`** — ~30+ exports flagged by ts-prune, verify against orgStore facade then prune. Also add a `tsconfig.api.json` so api/ gets the same dead-code analysis.
