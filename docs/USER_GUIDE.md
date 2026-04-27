# Aeiforo Nexus — Client Walkthrough

A practical end-to-end guide for navigating Aeiforo Nexus, from first login to publishing an assured sustainability report. Written for evaluators (PTTGC, audit teams, sustainability officers) who want to drive the product themselves rather than watch a demo.

> **Tip — drive it like the role would.** Most pages do different things depending on who's signed in. The "Switch role" panel on the **Admin → Users & Roles** page lets you hop between perspectives in one click without logging out.

---

## 1. Sign in

URL: `https://nexus-eta-dun.vercel.app` (or your private deploy)

You can either:
- **Click any role tile** on the login screen — one click signs you in as that role with the demo password baked in.
- **Or type credentials manually.** All demo accounts share the password `demo2026`.

| Tile | Email | Role | Lands on |
|---|---|---|---|
| ADM | `admin@aeiforo.com` | Platform Admin | Dashboard |
| GSO | `so@aeiforo.com` | Group Sustainability Officer | Approval queue |
| SL  | `tl@aeiforo.com` | Subsidiary Lead | Review queue |
| PM  | `fm@aeiforo.com` | Plant Manager | My Tasks |
| DC  | `maya@aeiforo.com` | Data Contributor | My Tasks |
| NO  | `narrator@aeiforo.com` | Narrative Owner | My Tasks |
| AUD | `aud@aeiforo.com` | Auditor (read-only) | Auditor view |

Enterprise SSO (Azure AD, Okta, IDaaS) is on the roadmap — the button is shown but disabled in the demo build.

---

## 2. Picking how to start (admin only)

When you sign in as **Platform Admin** for the first time, the workspace is **empty by default**. The Dashboard shows one card:

> **Load PTT Global Chemical sample data** — single click to pre-fill an org tree, climate targets, materiality matrix, and FY2025 cycle so you can demo every flow in seconds.

**Two paths from here:**

### Path A — Demo path (recommended for evaluation)
Click **Load demo setup**. A modal seeds:
- 7 entities (group + 3 subsidiaries + 3 plants)
- 2 climate targets (SBTi near-term + net-zero)
- 5 material topics (Climate, Water, Process Safety, Circular Economy, Anti-corruption)
- FY2025 reporting cycle

Takes ~3 seconds. The modal closes automatically. The Dashboard now shows the populated workspace.

### Path B — Onboard manually
Dismiss the card with `×`, then walk through the **Setup Guide** widget (sidebar) in your own time. Each step is gated on real DB writes — you actually have to add the entity, invite the user, etc., to get the green tick.

### Path C — Reset for a fresh demo
Already loaded the sample? On the **Onboarding** page (`/onboarding`), click the red **⟲ Reset workspace** button (top-right). Type `RESET` to confirm. Workspace wipes; users + roles + audit trail are preserved. The CTA card returns and you can re-seed in one click.

---

## 3. End-to-end demo flow

The "golden path" PTTGC's evaluators usually want to see, role by role.

### Step 1 — Admin sets up (one-time)
1. Sign in as **ADM**.
2. Click **Load demo setup** on the Dashboard.
3. Wait ~3 seconds for the four green ticks.

### Step 2 — Import emission data and publish (GSO)
1. Switch to **GSO** via Admin → Users & Roles → Switch role panel.
2. Open **Report → Publish centre**.
3. Click **Import from Excel** (top-right) → **Load PTTEP Demo Data** (the sample is 46 rows of GHG sources across Scope 1/2/3 already wired into the modal). Review the preview, click **Import 46 Rows**.
4. The system computes Scope 1/2/3 totals, populates GRI 305-* assignments, marks them approved, shows a success banner.
5. Click **Publish report now** in the banner. The PDF is generated, hashed (SHA-256), anchored to OpenTimestamps. You see a "Version 1 published" card with:
   - Verification URL (`/verify/{token}` — public, no login)
   - Hash fingerprint
6. Click the verification URL. Public page renders with the document hash, anchor proof, and assurance status. This is what an external auditor would see.

### Step 3 — Run the Performance Data report
1. Open **Report → Performance data**.
2. Page renders the PTTGC PDF format: Financial / Manufacture / Human / Social / Natural Capital + JV section, year columns 2022–2025.
3. Click **Add reporting year** → year defaults to 2026. Either:
   - Click "**generate sample 2026 data (demo)**" inside the modal for an instant column, OR
   - **Download Excel template** → fill in your real values → drop the file. Each row matches by `id`, `GRI`, or label.
4. A new 2026 column appears across every section, flagging unmatched rows (if any).

### Step 4 — Audit the result (Auditor)
1. Switch to **AUD**.
2. Open **Report → Publish centre** → see the published version with the assurance badge.
3. Open **System → Audit trail** to see the tamper-evident hash chain — every value entry, status change, and publish event recorded with a previous-hash ↔ new-hash link.
4. Or visit the public `/verify/{token}` URL — confirms the PDF hash matches what was anchored.

### Step 5 — Reset between demos
- Onboarding → **Reset workspace** → wipe and start over.
- The CTA card returns; you're set for the next session.

---

## 4. Roles in plain English

| Role | What they do | Home page |
|---|---|---|
| **Platform Admin** | Manages users, org tree, frameworks, all admin pages. Highest privilege. | `/dashboard` |
| **Group Sustainability Officer (GSO)** | Approves consolidated figures, signs off the report, hits Publish. | `/workflow/approval` |
| **Subsidiary Lead (SL)** | Reviews submissions from plants in their subsidiary. | `/workflow/review` |
| **Plant Manager (PM)** | Owns a single plant. Assigns tasks to data contributors. Enters values. | `/my-tasks` |
| **Data Contributor (DC)** | Answers assigned GRI questions, attaches evidence (PDF/Excel/photo). | `/my-tasks` |
| **Narrative Owner (NO)** | Writes governance, strategy, materiality narrative. Doesn't touch numbers. | `/my-tasks` |
| **Auditor (AUD)** | Read-only access to published data + audit trail. Cannot edit anything. | `/reports/auditor` |

Each role's sidebar shows only what they can act on. No noise.

---

## 5. The sidebar at a glance

The left rail organises pages into 6 collapsible sections. Items hidden behind **Show advanced** are utility / power-user pages that most demos don't need.

### Home
- **Overview** — role-tailored dashboard with KPIs and next action.
- **My tasks** — personal queue (contributors / plant managers / narrative owners).

### Workflow
- **Review queue** — submissions waiting for plant/subsidiary review.
- **Approval queue** — items waiting for GSO sign-off.
- **Group rollup** _(advanced)_ — equity-weighted aggregation across subsidiaries.

### Report
- **Publish centre** — generates the auditor-grade PDF, runs the Excel-import-to-approve flow, manages assurance.
- **Performance data** — the PTTGC-format performance report with dynamic year columns.
- **GRI index** _(advanced)_ — table-of-contents view of every disclosure.
- **Analytics** — drill-down dashboards by entity / scope / framework.
- **Anomalies** — z-score, peer-deviation, YoY-spike flags on the data review queue.

### Data
- **Data standard** — canonical definitions for every disclosure (calc method, owner role, cadence).
- **Calculators** — typed formulas for emissions, intensity, injury rate, gender pay gap, etc.

### Admin
- **Setup guide** — reappears as a checklist when you've started progressing.
- **Reporting cycles** — open/close FY periods.
- **Materiality** — double materiality assessment.
- **Climate targets** — SBTi near-term, long-term, net-zero, custom targets.
- **Assignments** — route each disclosure to the right person.
- **Users & roles** — team management + the **Switch role · demo** panel for live multi-perspective demos.
- **EF library** _(advanced)_ — emission factor reference.
- **GWP values** _(advanced)_ — global warming potentials per gas.

### System
- **Audit trail** _(advanced)_ — tamper-evident hash chain of every change.
- **Settings** — framework picker, theme, personal preferences.

The **Show advanced** toggle at the bottom of the sidebar reveals/hides the utility entries.

---

## 6. Common tasks — one-page recipes

### Add a new user
1. Admin → **Users & Roles**.
2. Click **+ Add user** (top-right).
3. Enter name, email, password, pick a role (single select).
4. **Add user**. They're in immediately, can sign in with that password.

### Change a user's role
1. **Users & Roles** table → row for that user → **Change role** button.
2. Pick a different role → **Save change**.

### Set a climate target
1. Admin → **Climate targets**.
2. **Add target**.
3. Pick kind (SBTi near-term / long-term / Net-zero / Custom).
4. Fill in label, scope coverage (Scope 1+2 etc.), baseline year + value + unit, target year, reduction % (slider).
5. Auditor-grade tip: SBTi near-term should be ≥42% by 2030 (1.5°C-aligned).
6. **Create target**.

### Run materiality assessment
1. Admin → **Materiality**.
2. Add topics with impact + financial scores (1–5 integer scale).
3. Topics scored above the threshold land on the materiality matrix and surface in the GRI 3 narrative.

### Open a reporting cycle
1. Admin → **Reporting cycles**.
2. Add a period (e.g. FY2025) with start/end dates.
3. Set status `active` to allow data entry.

### Assign a disclosure
1. Admin → **Assignments**.
2. Pick a GRI line item from the catalogue.
3. Pick the entity (plant/subsidiary).
4. Pick the assignee (must already be a member of that entity).
5. Set due date if needed. The contributor sees it on **My Tasks**.

### Import an Excel file (Reports → Publish centre)
1. **Publish centre** → **Import from Excel** (top-right).
2. Drop a `.xlsx` / `.xls` / `.csv` file, or click "Load PTTEP Demo Data" for the bundled sample.
3. Auto-mapping detects columns by smart aliases (`Scope`, `Category`, `Source/Facility`, `Fuel/Factor`, `Quantity`, `Unit`). Adjust if needed.
4. Preview groups rows by Scope 1/2/3 with totals. Click **Import N Rows**.
5. The system computes tCO₂e per row, sums by scope, writes to GRI 305-1/305-2/305-3 assignments, sets status to **approved**.
6. Banner: "X rows imported, Y disclosures auto-populated · Publish report now".
7. Click **Publish report now** to generate the PDF and anchor the hash.

### Add a 2026 column to the Performance Data report
1. **Reports → Performance data**.
2. **Add reporting year** (top-right) → year defaults to 2026.
3. Either drop a filled Excel (use **Download Excel template** first) or click the demo generator inside the modal.
4. New column appears across all 5 capital sections + JV.

### Publish a report
1. **Publish centre** → pick the active period.
2. Confirm coverage % is non-zero (you need at least one approved disclosure).
3. Click **Publish report**.
4. PDF is generated server-side, hashed, anchored to OpenTimestamps. A "Version N published" banner shows the verify URL.
5. Click the verify URL to see the public verification page (no login required).

### Request external assurance
1. **Publish centre** → **Request assurance** (top-right).
2. Fill auditor firm, contact, level (limited / reasonable), ISAE reference.
3. **Create request**. The system generates a one-shot upload link.
4. Send the link to the auditor — they don't need a Nexus login.
5. Once they upload a signed statement, the report's draft watermark lifts on the next publish.

### Switch role mid-demo (admin only)
1. Admin → **Users & Roles** → "Switch role · demo" panel.
2. Click any of the 7 role tiles. You're now signed in as that user, on their home page.
3. Useful for showing the same workflow from each role's perspective without logout/login overhead.

### Reset the workspace
1. Admin → **Onboarding**.
2. Top-right red **⟲ Reset workspace** button.
3. Type `RESET` to confirm.
4. Wipes entities, members, targets, materiality, periods, assignments, published reports, assurance requests. Preserves your login, users + roles, GRI catalogue, audit trail.
5. Returns to Dashboard with the demo-seed CTA visible. Re-seed if you want.

---

## 7. Excel formats

### Emission-data Excel (Publish centre import)
Columns auto-detected from many name variants:

| Field | Examples of names that auto-map |
|---|---|
| Scope | `Scope`, `GHG Scope`, `Type` |
| Category | `Category`, `Emission category`, `Source type` |
| Source / Facility | `Source`, `Facility`, `Asset`, `Site`, `Equipment`, `Name` |
| Fuel / Factor | `Fuel`, `Fuel type`, `Factor`, `Energy type`, `Refrigerant`, `Mode`, `Spend category` |
| **Quantity** (required) | `Quantity`, `Amount`, `Volume`, `Consumption`, `Value`, `Qty`, `Total` |
| Unit | `Unit`, `Units`, `UoM`, `Measure` |

Only Quantity is mandatory. The system computes tCO₂e per row using built-in emission factors (IPCC 2006 / EPA / DEFRA / regional grids).

### Performance-data template (Performance data → Add year)
Click **Download Excel template** to get a sheet pre-filled with the latest year's values. Each row carries:

```
Section | Table | id | GRI | Required Data | Unit | Value
```

Or for split rows (workforce, OHS):

```
Section | Table | id | GRI | Required Data | Unit | Male | Female
```

The `id` column is the canonical key — keep it intact and the import lands cleanly. Rows without a matching id fall back to matching by `Required Data` label, then `GRI + label`.

---

## 8. The publish & verify model — how it stays trustworthy

When the GSO clicks **Publish report**, four things happen server-side:

1. **PDF is rendered** from the approved disclosure values, narrative blocks, and metadata. Includes a cover with org branding, framework, period, assurance status, and a QR code.
2. **SHA-256 hash** of the PDF bytes is computed.
3. **Hash is anchored** to OpenTimestamps — a public timestamp calendar that records the hash on the Bitcoin blockchain. The proof is independent of Aeiforo.
4. **Hash chain** entry is appended to `blockchain_records` with `previous_hash → new_hash` linkage. Anyone with two records can recompute the chain to prove no row was altered.

A recipient can verify a published PDF without trusting Aeiforo:
1. Compute SHA-256 of the file they received.
2. Visit `/verify/{verification-token}` (the URL on the cover QR code).
3. The page shows the registered hash + anchor proof. Match = file hasn't been altered.

For external assurance, the auditor's signed ISAE 3000 statement gets its own hash, embedded into the next published version. The "DRAFT" watermark on the PDF cover only lifts when an assurance statement is attached.

---

## 9. Glossary

| Term | Plain English |
|---|---|
| **GRI Standards** | Most-used global standard for sustainability disclosures (universal + topic standards). What this demo defaults to. |
| **CSRD / ESRS** | EU corporate sustainability reporting directive; ESRS is the underlying standard set. Coming Soon in the UI. |
| **IFRS S1 / S2** | ISSB sustainability standards. S1 = general; S2 = climate-specific. |
| **TCFD** | Task Force on Climate-related Financial Disclosures. Risk-and-strategy framework. |
| **CDP** | Annual climate / water / forests questionnaire investors care about. |
| **SASB** | Industry-specific KPIs designed for investor decisions. |
| **Scope 1** | Direct GHG emissions from sources you own/control (combustion, vehicles, refrigerants). |
| **Scope 2** | Indirect emissions from purchased electricity / steam / heat. |
| **Scope 3** | All other indirect emissions across the value chain — 15 categories. |
| **SBTi** | Science Based Targets initiative — validates climate targets against 1.5°C science. |
| **DMA / Materiality** | Identifying topics that matter to your business and stakeholders. Double = considers both impact-on-world and impact-on-business. |
| **ISAE 3000** | Global standard for assurance over non-financial information. Limited or Reasonable level. |
| **OpenTimestamps** | Free Bitcoin-anchored timestamp service. Provides tamper-evident proof a file existed at a specific moment. |
| **SHA-256** | 256-bit cryptographic fingerprint. Any change to the file = different fingerprint. |
| **TRIR / LTIFR** | Total Recordable Injury Rate / Lost-Time Injury Frequency Rate — workforce safety metrics. |
| **Process Safety Tier 1 / 2** | Safety incident severity classification (Tier 1 = most severe). |

---

## 10. Troubleshooting

### "Couldn't load publish centre · API error 500"
Backend env vars probably aren't set. Production needs:
- `JWT_SECRET` (≥32 chars — `openssl rand -hex 32`)
- `DATABASE_URL` (Neon Postgres connection string)
- `ALLOWED_ORIGINS=https://your-deployed-url`
- `VITE_DEMO_PASSWORD=demo2026` (only if you want the role tiles visible)

After setting these in Vercel project env (Production + Preview), redeploy.

### "Something went wrong" white-screen-style page
The ErrorBoundary caught a render error. The error message is shown in the dialog. Click **Try again** to recover state, or **Go home** to reset.

If it keeps happening, check the browser DevTools console for the actual stack trace.

### "I see 8× duplicates in calculators / data entry"
Your DB had multiple seed runs. The client now de-duplicates by canonical key, so the symptoms are visible only on data entry / workflow review queues that show real assignment rows. To clean the database properly, run the de-dup SQL migration noted in the engineering ledger.

### "I can't see the demo-seed CTA after a reset"
You're on a build older than `dc2e045`. After redeploy, reset again — the new code clears localStorage flags as part of the reset.

If you're already on the latest, manually delete `aeiforo_demo_cta_dismissed_v1` from DevTools → Application → Local Storage.

### Demo password tiles aren't visible on Login
`VITE_DEMO_PASSWORD` env var isn't set in the production build (this is intentional safety — the password doesn't ship in customer-facing builds without that flag). Set it in Vercel and redeploy, or sign in by typing `admin@aeiforo.com` / `demo2026`.

### Login spinner forever
Browser CORS is blocking the API response. Set `ALLOWED_ORIGINS=https://your-deployed-url.vercel.app` in Vercel env and redeploy.

### Import a file but nothing happened
The file was either empty or every row had `quantity = 0`. Check the preview step — the modal shows what will be imported before confirming.

### "Unable to seed workspace"
Look at the error string under the failure card. If it mentions `invalid input syntax for type integer`, a numeric field has a decimal where the DB column is INTEGER. Latest builds round automatically — make sure you're on the most recent deploy.

---

## 11. Beyond the demo — what would happen in a real deployment

This guide covers the demo build. For a production rollout to PTTGC's live data:

- **Multi-tenant isolation** — each org gets its own `organisations` row; row-level access in every API query is keyed off the JWT's `org` claim.
- **SSO** — Azure AD, Okta, or PTT Group IDaaS over SAML 2.0 / OIDC. Login tiles are demo-only; real users SSO in.
- **Data residency** — Neon supports region pinning. PTTGC data can stay in AP-Singapore.
- **Connector setup** — SAP HANA, Maximo, Salesforce, IoT/CEMS streams; built into the **Data Collection** module.
- **Calculator coverage** — extend the registry in `src/calculators/registry.ts` with PTTGC-specific formulas (e.g. petrochemical-specific intensity ratios).
- **Approval chain** — current setup is two-stage (Subsidiary Lead → GSO). Three-stage and four-stage approval are configurable per disclosure.
- **Translations** — UI is English; Thai (and other languages) added via the framework's i18n layer.

---

## Quick links

- **Demo URL:** `https://nexus-eta-dun.vercel.app`
- **Demo password:** `demo2026` (all 7 role accounts)
- **Public verification:** any published report's QR code → `/verify/{token}`
- **Auditor upload (no login):** `/assure/{token}` — generated when an assurance request is created

---

*Last updated 2026-04-27. For platform questions, contact: support@aeiforo.com*
