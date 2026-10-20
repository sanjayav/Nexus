# Nexus: ESG and sustainability reporting

Nexus is a bilingual (English / 简体中文) sustainability-reporting platform. It covers data collection from business units, review and approval, carbon accounting, product footprints, supplier data, ESG ratings and the published report. Evidence is anchored to a ledger so auditors can verify every figure.

Region-aware workspaces serve two markets from one codebase:

| Workspace                                   | Region                     | Frameworks                                                                                                            | Trust chain / hosting                    |
| ------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 绿源控股集团 Lvyuan Holdings (demo, FY2026) | Mainland China, A+H listed | 沪深北交易所《可持续发展报告（试行）》指引, 财政部《企业可持续披露准则》, 港交所 ESG 守则, CASS-ESG 5.0, GRI, IFRS S2 | ChainMaker (BSN), Alibaba Cloud Shanghai |
| Aeiforo Green Energy (demo, FY2025)         | Global                     | GRI, MSX, IFRS S1/S2, BRSR Core, CSRD/ESRS, TCFD                                                                      | Polygon zkEVM, AWS eu-west-1             |

Language is a per-user setting; region is a per-tenant setting. A Chinese CSO can work in the global tenant, and an English-speaking auditor can review the mainland tenant.

---

## Contents

1. [Quick start](#1-quick-start)
2. [Who it is for](#2-who-it-is-for)
3. [Features](#3-features)
4. [Architecture](#4-architecture)
5. [Engineering conventions](#5-engineering-conventions)
6. [Testing](#6-testing)
7. [China edition](#7-china-edition)
8. [Chinese terminology](#8-chinese-terminology)
9. [Status and roadmap](#9-status-and-roadmap)

---

## 1. Quick start

Requires Node 20 or later.

```bash
npm install
npm run dev            # http://localhost:5173
```

Demo sign-in: `user1@marklytics.co.uk` / `marklytics`. Switch tenant from the organisation menu (top left) and language from the 中文 / EN control (top right).

| Script                            | What it does                                                                                       |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| `npm run dev`                     | Vite dev server                                                                                    |
| `npm run build`                   | Typecheck, then production build to `dist/`                                                        |
| `npm run check`                   | Typecheck, lint, unit and component tests (the CI gate)                                            |
| `npm test` / `npm run test:watch` | Vitest (unit, component, terminology gate)                                                         |
| `npm run test:e2e`                | Playwright against the production build. Locally, set `PW_CHANNEL=chrome` to use installed Chrome. |
| `npm run lint` / `npm run format` | ESLint / Prettier                                                                                  |

All demo data lives in the browser. **Reset demo data** in the profile menu restores the current workspace and leaves the others untouched.

## 2. Who it is for

Nexus asks on first sign-in how the person will use it and sets up their home screen. The answer can be changed any time in the profile menu.

| Person                                         | What they see first                                                                                                                                         | Designed for                                                                                                                                      |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Executive** (董事、总经理、财务总监、董秘)   | **Executive summary**: one sentence of status (按计划推进 / 需要关注 / 存在风险), the decisions waiting for them, and four headline figures in plain words. | Large type, no charts to decode, jargon explained on hover or tap, and a printable one-page briefing. A **larger text** mode scales every screen. |
| **Data preparer** (基地安环、财务、人力、采购) | **Task inbox** and their sections                                                                                                                           | Excel templates and paste-from-Excel, autosave, an in-place note when a reviewer sends something back, @mentions.                                 |
| **Reviewer** (可持续发展办公室、内控)          | **Task inbox**, then the review queue                                                                                                                       | Answers shown inline, approve / request changes / reject, bulk approval, a review checklist, and an audit trail.                                  |
| **Power user**                                 | Anything                                                                                                                                                    | `⌘K` command palette, `?` for shortcuts, `g` + key to jump (`g h` home, `g t` tasks, `g f` frameworks, `g i` import, `g r` report).               |

Every screen works at 375 px on a phone. Dialogs become bottom sheets and tables scroll inside their card.

## 3. Features

### Collect and collaborate

- **Disclosure frameworks and data entry.**
  - Answers autosave.
  - Each section moves 未开始 → 填报中 → 审核中 → 已退回 / 已通过, and submission is blocked until required answers exist.
  - Submitted and approved sections lock until someone reopens them.
- **Review queue:** per-section decisions with mandatory notes for returns, bulk approve, a review checklist and an immutable activity log. Decisions notify the preparer.
- **Comments and @mentions** on any field. A mention notifies the colleague, and channels follow the region (企业微信 / 钉钉 / 飞书 for mainland tenants).
- **Data import (数据导入):** download a pre-filled Excel template per framework, upload .xlsx/.csv or paste from Excel, map columns, then validate and preview before anything is written.
  - Notes in the template become comments on the field.
  - CSVs saved by Chinese Excel (GB18030) are read correctly.
- **Task inbox** combining assigned tasks with live workflow work: sections returned to you, sections awaiting your review.
- **Notification centre** fed by submissions, decisions, imports and mentions.

### Measure and manage

- **Carbon accounting** for Scopes 1–3 with region-specific factors: MEE 电力二氧化碳排放因子 for mainland tenants, CEA for India.
- **Carbon assets (碳资产):** green power and certificate ledger reconciling market-based Scope 2, carbon-credit holdings and retirements (CCER, VCS), and national ETS status and watchlist.
- **Product footprint and export compliance (产品碳足迹):**
  - Product carbon footprints per GB/T 24067-2024 / ISO 14067, with lifecycle breakdown, what-if modelling and certification status.
  - EU Battery Regulation passport readiness.
  - CBAM embedded-emissions view for aluminium and steel export lines.
- **Suppliers (供应商管理):** a Scope 3 Category 1 coverage KPI, risk flags and invitations to three questionnaire templates (ESG, PCF data, critical-minerals due diligence). Includes a verify / return workflow.
- **Double materiality, Scope 3 calculator, GHG targets, AI drafting assistant.**

### Overview

- **Command center:**
  - Executive summary, or a detailed view with the reporting pipeline, "for you today", next filing deadline and live activity.
  - Framework coverage, integrity and approvals funnel.
- **ESG ratings (ESG 评级):** Wind, 华证, 中证, 商道融绿, MSCI, CDP, S&P CSA and EcoVadis, with history, gap-to-next-grade diagnostics deep-linked to the pages where each gap is fixed, an action plan and a questionnaire calendar. Ratings are illustrative demo data.
- **Analytics, gap analysis, peer benchmark.**

### Trust and publish

- **Evidence vault and on-chain verification:** content-addressed evidence, anchors, integrity timeline, DID/VC identities.
- **Report builder:** document language independent of UI language, PDF, exchange format and XBRL exports.
- **Index table (对标索引表):** every disclosure requirement mapped to its report section with a live disclosure status, comply-or-explain notes for items that do not apply, and Excel export in Simplified Chinese, **Traditional Chinese for the HKEX filing** (OpenCC, Hong Kong standard) or English.

## 4. Architecture

React 18 + TypeScript (strict) + Vite, Tailwind, `motion` for animation, zustand for state, Recharts for charts. Pages are code-split per route, so first load stays small on cross-border links into mainland China. Web fonts never block render, and CJK text uses system fonts.

```
src/
  app/            App (router), routes.tsx (route table), providers.tsx
  components/
    ui/           Design system: Button, Card, Badge, Tabs, Sheet, Dialog, Stat, motion primitives…
    layout/       Shell: Sidebar, CommandPalette, NotificationCenter, navigation.ts (IA)
    help/         Term (jargon explanations), WelcomeDialog, ShortcutsDialog
  features/<domain>/   One folder per product area: <Name>Page.tsx, <name>.strings.ts, components/, data.ts, store.ts
  lib/            i18n core and shared dictionaries, glossary, hooks, spreadsheet (xlsx/csv), Chinese conversion
  config/         Region profiles, regulatory calendar
  data/           Tenant seed data (seed.global.ts, seed.cn.ts), people directory
  store/          Reporting store and user preferences
e2e/              Playwright specs (flows + every-route smoke test)
```

**Data model.**

- Seed data (`src/data`) is immutable. User changes go through store actions in `src/store/reporting.ts` (answers, workflow status, comments, comply-or-explain notes, activity, notifications).
- State is partitioned by workspace and persisted to `localStorage`. Views merge seed and overrides through `useSectionViews()` / `usePipeline()`.
- Feature-specific state (suppliers, ratings, products, carbon assets) lives in each feature's own `store.ts` with the same pattern.
- Replacing localStorage with an API is one module per store. Pages never touch storage directly.

**Workspace layer.**

- `WorkspaceProvider` selects the tenant.
- `useMockData()` returns its seed.
- `useMoney()` / `useFormat()` format currency and numbers per locale (万/亿 in Chinese).
- `REGIONS` in `src/config/regions.ts` decides frameworks, emission factors, trust chain, SSO, notification channels and data residency.

## 5. Engineering conventions

- **Imports:** `@/…` across folders and `./…` within one. ESLint rejects `../`.
- **Strings:** every visible string lives in a `*.strings.ts` dictionary with `en` and `zh` (`defineStrings`), with no literals in JSX. Tenant content (names, notes, site names) is data and stays in the tenant's language.
- **Formatting:** numbers, dates and currency go through `useFormat()` / `useMoney()`.
- **New demo data must exist for both workspaces.** Mainland data is in Simplified Chinese and consistent with the figures documented at the top of `seed.cn.ts`.
- **UI:**
  - Build from `@/components/ui`.
  - Colour carries meaning only (status, emphasis).
  - Empty, loading and error states are designed.
  - Every page works at 375 px.
- **Motion** (`components/ui/motion.tsx`):
  - Enter: 180–280 ms ease-out with ≤ 8 px travel.
  - Springs for things that move between positions: tab pills and the nav indicator (`layoutId`), sheets, drawers.
  - `AnimatedNumber` for headline figures.
  - Nothing animates on typing or delays an action.
  - Reduced motion is honoured globally (`MotionConfig reducedMotion="user"`).
- **Accessibility:**
  - Dialogs are labelled by their title and trap focus on open.
  - Popovers close on Escape and outside click.
  - Status is never colour-only.
  - Interactive cards are `article`s named after their content.

## 6. Testing

| Layer            | Where                                  | What it proves                                                                                                                                                                                                                                |
| ---------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit             | `src/**/*.test.ts`                     | Store transitions (submit → return → approve, isolation, reset, import notes); spreadsheet parsing / mapping / validation; carbon maths (market-based Scope 2 reconciles exactly to the seed, PCF what-if, CBAM exposure, passport readiness) |
| Component        | `src/**/__tests__/*.test.tsx` (jsdom)  | Real pages with real providers: submit blocked until complete, locked sections, approve / return-with-note / bulk approve, @mention suggestions and notifications                                                                             |
| Terminology gate | `src/lib/i18n/glossary.test.ts`        | Scans **every** zh string in every dictionary for banned wording and half-width punctuation inside Chinese (§8)                                                                                                                               |
| End-to-end       | `e2e/` (Playwright, desktop + Pixel 7) | Sign-in and first run as an executive; the full preparer ↔ reviewer loop surviving reload; **every route** in zh and en for both tenants with no console errors and no horizontal overflow                                                    |

CI (`.github/workflows/ci.yml`) runs `npm run check` and `npm run build` on every push.

## 7. China edition

### What competitors offer (research, Oct 2026)

Domestic vendors compete on **carbon** more than on report writing.

| Vendor            | Strength                                              |
| ----------------- | ----------------------------------------------------- |
| 碳阻迹 Carbonstop | 碳云 platform, CCDB factors, Carbon Agent (PCF, CBAM) |
| 阿里云 能耗宝     | ISO 14064 inventory, ISO 14067 PCF, metering          |
| 妙盈 MioTech      | ESGhub, supply-chain ESG, AI                          |
| 远景 方舟         | IoT energy and carbon, supplier carbon network        |
| 用友 / 金蝶       | ERP-embedded carbon                                   |
| Workiva / SAP     | A+H report linkage / Green Ledger, CBAM               |

| #   | Gap a Chinese enterprise buyer expects              | Status                                               |
| --- | --------------------------------------------------- | ---------------------------------------------------- |
| 1   | Product carbon footprint and certification workflow | ✓ Product footprint                                  |
| 2   | CBAM for aluminium and steel lines                  | ✓ Export compliance                                  |
| 3   | Supplier portal and Scope 3 data exchange           | ✓ Suppliers                                          |
| 4   | Energy management (总能耗 in 吨标准煤)              | Partial (carbon page)                                |
| 5   | ESG rating management                               | ✓ ESG ratings                                        |
| 6   | Carbon assets: allowances, CCER, green-power ledger | ✓ Carbon assets                                      |
| 7   | A+H dual reporting and assurance readiness          | Partial (index table and Traditional Chinese export) |
| 8   | Scenario analysis and financial effects             | Not yet                                              |
| —   | Excel bulk collection                               | ✓ Data import                                        |

### Regulatory facts the product relies on

- **沪深北交易所《可持续发展报告（试行）》指引** (上交所第14号 / 深交所第17号 / 北交所第11号)
  - Effective 1 May 2024. Mandatory for 上证180, 科创50, 深证100, 创业板指数 constituents and dual-listed companies.
  - The FY2025 report was due 30 Apr 2026.
  - Scope 1 and 2 are mandatory and Scope 3 is encouraged. Companies must disclose carbon credits used and 清缴 status.
  - The 编制指南 was revised 30 Jan 2026 (第一号 to 第五号: framework, climate, pollutants, energy, water).
- **财政部《企业可持续披露准则第1号——气候（试行）》** (财会〔2025〕34号, 19 Dec 2025): voluntary until the implementation scope is set. Scope 2 must be location-based; market-based is optional.
- **HKEX:** Scope 1 and 2 are mandatory from FY2025. Hang Seng Composite LargeCap constituents must make full climate disclosures, including Scope 3, from FY2026.
- **EU:**
  - CBAM definitive period from 1 Jan 2026, certificate sales from 1 Feb 2027, first declaration 30 Sep 2027.
  - Battery passport from 18 Feb 2027; due diligence from 18 Aug 2027.
- **China PCF:** GB/T 24067-2024; CNCA 产品碳足迹标识认证 rules (lithium batteries and PV in the first catalogue); 电力碳足迹因子 2024 = 0.5777 kgCO₂e/kWh.

**Unverified, so do not present as fact:**

- The 2023 national 电力二氧化碳排放因子 (≈0.5306). The app defaults to the 2022 value of 0.5703.
- The Battery Regulation Art. 7 delegated-act status.
- SZSE and BSE guide numbering.
- CBAM deduction for China ETS prices.

Primary sources:

- [SSE guideline](https://www.sse.com.cn/aboutus/mediacenter/hotandd/c/c_20240412_10753197.shtml)
- [MOF climate standard](https://kjs.mof.gov.cn/zhengcefabu/202512/t20251225_3980202.htm)
- [MEE PCF report 2026](https://www.mee.gov.cn/ywgz/ydqhbh/wsqtkz/202606/W020260617335466326025.pdf)
- [Carbon market expansion](https://www.news.cn/info/20260106/f09d6356bfc64a69bb81fc36ace82c02/c.html)
- [CBAM certificates](https://www.dehst.de/EN/Topics/CBAM/CBAM-definitive-regime-2026/CBAM-certificates/cbam-certificates_node.html)

### What still blocks a real mainland launch

Most of these are business or legal decisions, not UI work.

| #   | Blocker                                            | Why                                                                                                          |
| --- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | **Backend.** Data is per-browser today.            | Multi-user workflow needs a server with tenant isolation and region-pinned storage (Alibaba Cloud Shanghai). |
| 2   | Mainland hosting and **ICP 备案**                  | Needs a Chinese legal entity or partner. The fallback is Hong Kong hosting.                                  |
| 3   | **PIPL / 数据安全法** cross-border rules           | Run a separate mainland deployment whose data never leaves.                                                  |
| 4   | **Generative-AI filing**                           | The AI assistant must call a mainland-filed model for cn tenants.                                            |
| 5   | **Blockchain service filing**                      | Use a filed BaaS (BSN / ChainMaker operator).                                                                |
| 6   | Real WeCom / DingTalk / Feishu SSO and SMS         | OAuth apps and approved SMS templates                                                                        |
| 7   | **等保 2.0 Level 3**                               | Expected by SOEs and large listed clients                                                                    |
| 8   | Native-expert review of framework text             | The copy follows §8 and is gate-tested, but a Chinese ESG professional should sign it off.                   |
| 9   | Chinese PDF typesetting and 电子签章               | Board sign-off of the published report                                                                       |
| 10  | Versioned emission factors                         | The MEE updates factors periodically.                                                                        |
| 11  | CNY contracting and 发票, Chinese support channels | Commercial                                                                                                   |

## 8. Chinese terminology

Chinese copy must read as native to a CSO, 董秘, assurance provider or exchange reviewer. The rules:

1. **Framework wording follows the framework.**
   - SSE screens use 治理 / 战略 / **影响、风险和机遇管理** / **指标与目标**.
   - MOF (CN-CSDS) screens use 治理 / 战略 / **风险和机遇管理** / **指标和目标**.
2. **Scopes:** **范围1 / 范围2 / 范围3** (Arabic numerals, as in 指引). Use Chinese numerals only when quoting MOF text.
3. **Assurance terms are not synonyms.**
   - **鉴证**: assurance, usually by a CPA firm.
   - **审验**: verification by a non-CPA body.
   - **核查**: GHG verification under the MEE regime.
   - **核验**: checking a blockchain proof.
   - **校验**: data validation.
4. **Preferred terms:**
   - **利益相关方**, not 利益相关者
   - **佐证材料**, not 证据
   - **对标索引表**, not 指标索引
   - **生命周期评价**, not 生命周期评估
   - 环境、社会及**管治** for HKEX
5. **Grid factors are two families:** 电力二氧化碳排放因子 (organisational accounting) vs 电力碳足迹因子 (PCF).
6. **Enterprise-software register:** 提交审核 · 审核通过 · 退回修改 · 驳回 · 待办 · 填报 · 导入模板. No literal translations (收件箱, 指挥中心, 引擎, 工作室) and no marketing superlatives.
7. **Typography:**
   - Full-width punctuation in Chinese sentences.
   - A half-width space between Chinese and Latin letters or digits (`范围1 排放`, `2026 年`).
   - 万/亿 in prose.

`src/lib/i18n/glossary.ts` holds the banned patterns (`ZH_BANNED`) and the plain-language explanations used by `<Term>`. Rules 2, 4 and 6 and the punctuation rule fail the build when broken. When a review catches a new term, add it to `ZH_BANNED`.

## 9. Status and roadmap

**Done.**

- Feature-based structure with a design system and motion system.
- Persisted reporting workflow (entry → review → decision → notification).
- Excel import, index table with Traditional Chinese export.
- ESG ratings, suppliers, product footprint and CBAM, carbon assets.
- Role-based onboarding, executive summary, larger-text mode, shortcuts.
- Gate-tested Chinese terminology.
- Unit, component and end-to-end tests in CI.

**Next.**

1. Backend API with tenant isolation, replacing the zustand persistence layer store by store.
2. Real SSO (WeCom first) and notification delivery.
3. Versioned emission-factor library with effective dates.
4. Energy management (吨标准煤, intensity) aligned with 编制指南第四号.
5. Scenario analysis and financial effects (MOF climate standard, 指南第二号).
6. Chinese PDF typesetting with e-seal sign-off.
7. Assurance portal (PBC lists, sampling, auditor access).
