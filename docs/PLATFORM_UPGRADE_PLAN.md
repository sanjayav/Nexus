# Nexus platform upgrade plan: premium design and China edition

**Date:** 2026-10-16 · **Branch:** `china-edition-v2` · **Owner decisions:** bolder design evolution (same structure and flows), build backend tables, ship via branch + preview.

**Evidence:**
- [Design & UX audit](audits/2026-10-design-ux.md)
- [Competitive & China gap analysis](audits/2026-10-competitive-gap.md)
- [China technical readiness](audits/2026-10-china-technical.md)

**Goal:** a reporting platform that competes with Workiva, Sweep, Persefoni and Watershed, and is the strongest choice for Chinese listed companies (A-share under the SSE/SZSE/BSE guidelines; A+H under the HKEX ESG Code).

**Positioning:** governed, auditable, bilingual disclosure. One dataset produces both the exchange report and the HKEX report, on mainland-compliant AI and cloud. No global leader has a China-native offering, and Chinese players are raters or carbon specialists that are weak at governed report authoring.

---

## Principles

- **Keep what works.** Same navigation, the assign → fill → review → approve → publish flow, roles, data model and features. Nothing is removed.
- **Truth first.** No screen claims success, emptiness or completion that it hasn't verified.
- **Language ≠ market.** UI language is per user. The market (frameworks, factors, AI provider, hosting, identity) is per organisation.
- **Every phase ends green:** typecheck, tests and build pass, plus screenshots in EN/ZH, light/dark, desktop/mobile.

---

## Phase 0: Correctness and safety (do first)

| # | Item | Source |
|---|---|---|
| 0.1 | Evidence download must check the requester's org (possible cross-tenant read) | CN audit |
| 0.2 | Downloads with Chinese filenames crash (`Content-Disposition` → RFC 5987 `filename*`) | CN audit P0 |
| 0.3 | Truthful states: My Tasks, review/approval queues and My Day show "all done"/"empty" while loading or on error | Design P0 |
| 0.4 | Publish (irreversible, hash-anchored) needs a confirmation step that shows readiness | Design P0 |
| 0.5 | Route-level error boundary inside the shell, so a page crash keeps the navigation | Design P0 |
| 0.6 | Dark-mode primary buttons at 1.5:1 contrast → per-mode button tokens | Design P0 |
| 0.7 | CJK safety: 12px floor in Chinese, no mid-word breaks in pills/dates, no uppercase on CJK | Design P0 |

## Phase 1: Design foundation (bolder evolution)

1. **Type:**
   - Self-host Inter (variable) and JetBrains Mono, and drop Google Fonts, DM Sans and Instrument Sans. This also fixes mainland rendering.
   - One type ramp: display-xl 56 → caption 12. Chinese has a 12px floor.
   - Fix the undefined `.text-display` that page titles use.
2. **Colour and surfaces:**
   - Per-mode button tokens.
   - An ink sidebar in both modes.
   - Three elevation levels.
   - Define the missing CSS variables, retire `#1B6B7B` and `.card-premium`.
   - Add a `.surface-hero` with an emerald wash and contour pattern.
3. **Motion system:**
   - `src/motion/tokens.ts` plus `MotionConfig reducedMotion="user"`.
   - Rewrite page transitions to remove ~280ms of dead time.
   - Signature pieces: sliding active indicators (sidebar, tabs, stages), a digit-roll `NumberTicker`, a `SealCheck` approval moment, and list exit/auto-advance.
4. **Assets:**
   - A contour-line illustration set (~12 two-tone SVGs that draw in on mount) for empty states, onboarding, errors and celebrations.
   - A contour background pattern for hero surfaces.
5. **Shared primitives:**
   - One `Skeleton` with a working shimmer.
   - One `EmptyState` with empty/cleared/filtered/error/loading variants.
   - One `StatusPill`.
   - A `StatLedger` KPI strip.
   - `ConfirmSheet` and toasts to replace 20 `alert()`/`confirm()` calls.
   - `ChartFrame` with chart tokens (emerald scope scale, target-gap band, direct labels).
   - A locale-aware `fmt` number helper (万/亿 in Chinese).
6. **Guard:** a lint rule against raw hex and palette classes in pages.

## Phase 2: Premium surfaces and user flow

- **My Day hero:**
  - Real reporting-period readiness.
  - One "Your next action" card that replaces six conflicting "what next" signals.
  - The ledger strip with sparklines.
- **One place to enter a value.** The answer panel, `/data/entry/:id` and the disclosure editor converge on a single entry surface. The others link into it.
- **Review and approval:**
  - A sticky decision bar.
  - Inline validation instead of `alert()`.
  - An approval moment: seal check, then the row exits, counters tick, and the next item auto-selects.
  - A "queue cleared" state.
- **Publish:** a readiness checklist, then a confirmation sheet, then a publish moment that shows the hash being anchored.
- **Settings:** split the 4,200px scroll into tabs (Organisation, Frameworks, Security, Notifications, Data residency).
- **Naming:** one name per page across nav, breadcrumb and title.
- **Onboarding:** consolidate six overlapping mechanisms into one guided setup.
- **Fix dead ends:** for example, "no reporting periods" now has a create action.
- **Mobile:** stage labels, pills and the decision bar work at 390px.

## Phase 3: Chinese report output (blocks Chinese clients today)

1. **PDF:**
   - Register a CJK font (Noto Sans SC regular/bold/italic, shipped with the function) and a CJK line-break callback.
   - Fix the italic crash.
2. **Report language:**
   - A `locale` on publish requests and `report_artifacts`.
   - A server-side string dictionary.
   - Remove the hardcoded Thai and Buddhist-era year.
3. **DB text:**
   - Add `section_zh` / `subsection_zh` columns and seed them for the China frameworks.
   - The generator selects `line_item_zh`.
4. **Frameworks in the generator:**
   - Add the China frameworks to the report generator's framework map.
   - An exchange-guideline report template and content index (not just "GRI Content Index").
5. **DOCX:** eastAsia fonts and the `zh-CN` language tag.
6. **CSV and Excel:**
   - UTF-8 BOM on exports.
   - GBK detection on import.
   - Fix CSV import (it currently always parses as xlsx).
7. **iXBRL:** `xml:lang`, plus CNY and tce units.

## Phase 4: China platform features

| Item | Notes |
|---|---|
| Org market settings | New `org_settings` table: market (`global`/`cn`), data residency region, ICP 备案号, 等保 level, cross-border transfer status; Settings tab |
| Per-org IM webhooks | DingTalk / Feishu / WeCom configured per organisation in Settings, replacing the global env vars |
| User language on server | `users.locale` and `Accept-Language`. Notifications, emails and anomaly headlines are rendered in the user's language |
| AI provider layer | `api/_llm.ts`: Anthropic (global) or an OpenAI-compatible mainland provider (Qwen / DeepSeek) per org. Answers follow the user's language; China frameworks are supported in drafting; AI-generated content is labelled; an org can switch AI off |
| Emission factors | Versioned China factors (national, market-based residual, regional); China orgs prefer MEE factors; AR6 GWP option. Official values verified before they become the default |
| Green power & carbon credits | A ledger of 绿证 / green-power contracts (market-based Scope 2) and CCER / carbon credits retired, which the exchange climate topics require |
| Regulatory calendar | China and global deadlines on My Day, with countdowns and links to the framework |
| Double materiality ↔ 21 exchange topics | Materiality topics map to the CN-SSE topic list |
| China sign-in | WeCom / DingTalk / Feishu buttons and +86 SMS OTP on login. Real OAuth is gated by admin-configured app credentials; until configured, they say so honestly. Users without email are supported |
| Mainland network hygiene | Login 3D scene not downloaded on mobile or in the CN market; Sentry replay off for CN orgs; translation bundles lazy-loaded per language |
| Formatting | Timezone-aware dates (Asia/Shanghai), locale number helpers replacing 14 hand-rolled k/M formatters |

## Phase 5: Competitive parity and differentiators (after 0–4; prioritise with owner)

- **A+H dual report:** one dataset maps exchange topics ↔ HKEX KPIs.
- **ESG rating improvement:** gap-to-rating view for Wind, 华证 and MSCI.
- **Supplier portal and questionnaires.**
- **Server-side calculations** with database factors (calculations currently run in the browser).
- **Assurance workspace** on real data (currently demo data), with 电子签章 for board sign-off.
- **Scenario analysis (light)** and a decarbonisation pathway.
- **Exporters:** product carbon footprint and CBAM reporting.
- **China connectors:** first live ones are Kingdee and Yonyou.
- **Data export:** environmental-disclosure export (企业环境信息依法披露) and national carbon market MRV export.
- **Agentic report drafting.**

## Not code: legal and infrastructure (critical path for a mainland launch)

1. A China legal entity or licensed partner.
2. ICP filing, plus the value-added telecom operating licence (ICP 经营许可证) for paid SaaS.
3. Hosting on Alibaba Cloud or Tencent Cloud. Vercel and Neon cannot serve the mainland, so a container deployment is needed.
4. Data security:
   - 等保 2.0 Level 3 security certification.
   - PIPL/DSL compliance and data kept onshore.
5. Service filings:
   - Generative-AI service filing and AI-content labelling.
   - Blockchain service filing, or no Bitcoin anchoring for China orgs.
6. Business operations:
   - An e-seal provider.
   - RMB invoicing (发票).
   - Trademark.
   - Assurance-firm partners.
7. Native ESG expert review of the China question sets and terminology.

## Order of work

```
Phase 0 ──┬─> Phase 1 foundation ──> Phase 2 surfaces & flow
          ├─> Phase 3 Chinese report output      (parallel; server-side files)
          └─> Phase 4 China features (backend first, then UI on Phase 1 primitives)
                                     └─> Phase 5 (owner prioritises)
```
