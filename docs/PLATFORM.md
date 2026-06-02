# Nexus — Sustainability Intelligence Platform

> Every framework. One dataset. Auditor-ready.

Nexus is built by Aeiforo for sustainability teams that need to produce
CSRD, ISSB, GRI, TCFD, CDP, SEC Climate, SB 253/261, and EU Taxonomy
disclosures from a single source of truth — and prove every value to an
auditor.

---

## 1. What Nexus does

### Carbon accounting
Calculators across all 15 GHG Protocol Scope 3 categories plus Scope 1
and Scope 2 (location-based and market-based). Emission factors are
pulled from a versioned, DB-backed library covering DEFRA 2024, EPA
2024, IPCC 2006/AR5, IEA 2024, and IMO sources. Vendor-to-EF AI
matching powers spend-based methods so contributors don't have to look
up factors by hand.

### Multi-framework disclosure
19 active frameworks (2,695 datapoints total) — see Section 2. A
linked-data engine maps a single concept (e.g. "Scope 1 emissions,
FY2026") to its representation in every framework, so editing the value
once propagates to GRI, CSRD, ISSB, TCFD, CDP, SEC, SB 253 and beyond.

### Document-centric editing
The disclosure editor is a three-pane Workiva-style interface: a
subsection tree on the left, an inline-editable typeset document in the
middle, and a cell rail on the right showing status, evidence,
comments, linked data, and audit trail. Cells respond to Tab / Enter /
Escape like a spreadsheet, with autosave on blur. Real-time multi-user
presence is provided via Liveblocks (cursor avatars, per-cell border
tints, "X is here" badges).

### Workflow and approvals
Bulk-assign disclosures to teammates with due dates. A reviewer +
approver chain (preparer → reviewer → approver → published) governs
every status transition. Overdue items surface in MyDay; an in-app
notifications inbox and optional email digests (Resend) keep
contributors on schedule. Every transition is signed and audited.

### Audit trail + blockchain anchoring
Every value write, every status change, and every approval is recorded
in a hash-chained audit log. Reports can be anchored via
OpenTimestamps; auditors verify the trail offline. Public
verification URLs let stakeholders confirm authenticity of a published
report without logging in.

### AI features
- Evidence extraction (PDF / image → structured values via Claude vision)
- Anomaly narration (year-over-year variance + likely cause in plain English)
- Vendor → emission-factor matcher (spend-based Scope 3)
- Report drafting (framework-aware narrative generation)

All AI calls are mediated server-side, scoped to the calling user's
organization, and rate-limited per endpoint.

### Identity and security
- Email + password authentication with bcrypt password hashing
- SAML SSO via WorkOS, with email-domain discovery
- SCIM 2.0 user provisioning (Azure AD, Okta-tested)
- TOTP MFA + single-use recovery codes (AES-256-GCM at rest)
- RBAC with 11 system permissions across 5 system roles
- API keys with scoped permissions
- Rate limiting on auth and AI endpoints
- JWT session tokens with rotating signing keys

### Operations
- `/api/health` health check + admin "System status" page
- Sentry + session replay (opt-in via VITE_SENTRY_DSN)
- EU and APAC data-residency scaffolding (per-tenant Neon project routing)
- GDPR data export (ZIP) and account deletion endpoints
- Multi-region SSO callback support

---

## 2. The 19 frameworks shipping today

| Framework                                      | Code     | Questions |
| ---------------------------------------------- | -------- | --------: |
| GRI Standards (Universal + Topic)              | GRI      |    2,003  |
| CSRD ESRS E1 — Climate Change                  | CSRD E1  |       84  |
| CSRD ESRS E2 — Pollution                       | CSRD E2  |       31  |
| CSRD ESRS E3 — Water & Marine Resources        | CSRD E3  |       29  |
| CSRD ESRS E4 — Biodiversity & Ecosystems       | CSRD E4  |       30  |
| CSRD ESRS E5 — Resource Use & Circular Economy | CSRD E5  |       37  |
| CSRD ESRS S1 — Own Workforce                   | CSRD S1  |       78  |
| CSRD ESRS S2 — Value Chain Workers             | CSRD S2  |       30  |
| CSRD ESRS S3 — Affected Communities            | CSRD S3  |       28  |
| CSRD ESRS S4 — Consumers & End-Users           | CSRD S4  |       27  |
| CSRD ESRS G1 — Business Conduct                | CSRD G1  |       32  |
| ISSB IFRS S1 — General Sustainability          | ISSB S1  |       33  |
| ISSB IFRS S2 — Climate                         | ISSB S2  |       58  |
| TCFD Recommendations                           | TCFD     |       27  |
| CDP Climate Change 2024                        | CDP CC   |       91  |
| SEC Climate Disclosure Rule                    | SEC      |       24  |
| California SB 253 (CCDAA)                      | SB 253   |       13  |
| California SB 261 (Climate Risk)               | SB 261   |       13  |
| EU Taxonomy Alignment                          | EU Tax   |       27  |
| **Total**                                      |          | **2,695** |

The catalog is defined in `src/lib/frameworks.ts`. Adding a new
framework is one record + a questionnaire seeder — no UI rework.

---

## 3. Architecture

React 18 + TypeScript SPA (Vite 5). Backend is Vercel serverless
functions (Node 20) backed by Neon Postgres. JWT auth, bcrypt password
hashing, zod validation across every API boundary. Tailwind CSS with a
custom design system. Framer-motion for animation. Liveblocks for
realtime presence. Anthropic Claude Sonnet 4.6 for AI features.

Build profile: ~382 KB main bundle, lazy-loaded routes, premium-easing
motion, light + dark + auto theme, mobile-first responsive shell.

---

## 4. Pages by role

### Platform Admin (PA)
- Org structure, users, roles, permissions
- Reporting periods
- Frameworks enablement
- API keys, SCIM tokens
- Audit log, system status, blockchain audit explorer
- Settings (theme, density, notifications)

### Group Sustainability Officer (GSO)
- MyDay (role-aware home)
- Disclosure editor (every active framework)
- Materiality assessment
- Climate targets
- Report publishing and preview
- Anomaly detection

### Subsidiary Lead (SL)
- Workflow queue (review + approve)
- MyTasks
- Disclosure editor (subsidiary scope)

### Plant Manager (PM)
- MyTasks (assignments for own plant)
- Data Entry + spreadsheet
- Evidence library
- Calculators (Scope 1/2/3)

### Data Contributor (DC)
- MyTasks
- Single-disclosure entry

### Auditor (AUD)
- Auditor view (read-only with per-cell full trail)
- Verify report (public link, no login)
- Audit log

---

## 5. Frameworks supported (live, not stubbed)

CSRD ESRS E1–E5, S1–S4, G1 · ISSB IFRS S1 + S2 · TCFD · GRI Universal
+ Topic standards · CDP Climate Change 2024 · SEC Climate Disclosure
Rule · California SB 253 + SB 261 · EU Taxonomy.

All are wired through the same disclosure editor, the same evidence
model, the same audit trail, and the same publishing pipeline.

---

## 6. The honest "what isn't done"

**Vendor accounts you provide:**
- `ANTHROPIC_API_KEY` — AI features (extraction, narration, drafting)
- `RESEND_API_KEY` — email notifications
- `WORKOS_API_KEY` + `WORKOS_CLIENT_ID` — SAML SSO
- `LIVEBLOCKS_SECRET_KEY` — realtime collaboration
- `VITE_SENTRY_DSN` — error tracking + session replay

When a key is absent the platform degrades gracefully (the disclosure
editor displays a "Solo mode" badge, AI buttons disable with a tooltip,
the SSO option hides behind email + password).

**Compliance programs (calendar work):**
- SOC 2 Type II
- ISO 27001
- Penetration test

**Customer-side (depends on customer):**
- Real SAP / NetSuite / Snowflake credentials for live ERP sync
  (CSV templates ship today)
- IdP test tenants for SAML verification
- iXBRL filing credentials with the relevant regulator

---

## 7. Comparison vs Workiva

| Capability             | Nexus                                | Workiva                               |
| ---------------------- | ------------------------------------ | ------------------------------------- |
| Frameworks supported   | 19 active                            | 18+                                   |
| AI drafting            | Claude Sonnet 4.6                    | Multi-LLM (Gemini, OpenAI, Anthropic) |
| Linked-data engine     | Concept mappings, propagation        | Native data linking                   |
| Excel-style editing    | Yes (DataEntrySpreadsheet, editor)   | Yes (Workiva Spreadsheets)            |
| Realtime collab        | Liveblocks-backed                    | Yes                                   |
| iXBRL tagging          | Skeleton; partner integration ready  | Industry-leading                      |
| Compliance certs       | In progress                          | SOC 2, ISO 27001, FedRAMP             |
| Implementation time    | Self-serve, <1 day                   | ~4 months typical                     |
| Pricing                | £500 / mo (Team tier)                | $31K–$145K+ / yr                      |

---

## 8. Where the value lives

**For an investor:** this is a Workiva-tier sustainability platform
built for a fraction of the cost, with modern UX, real AI integration,
and self-serve onboarding. The moat isn't features — Workiva has more —
it's the combination of speed-to-value, an AI-native workflow, and a
price point that opens markets Workiva can't serve.

**For a customer:** replace your ESG spreadsheets + manual report
assembly + auditor email chain with a single workspace where the same
dataset generates CSRD, ISSB, GRI, TCFD, and CDP reports — and the
audit trail is hash-chained from day one.

**For a new engineer:** every page in `src/pages/` is a real route;
every API call lives under `api/` with a matching zod schema; the
design system is one Tailwind theme; and the test suite (`npm test`)
covers the load-bearing flows. Start with `src/App.tsx` → routes,
then `src/lib/api.ts` → the typed client.
