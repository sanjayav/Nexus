# Nexus: product gap analysis for global leadership and the China market

- **Repo audited:** `/Users/kick/Desktop/Aeiforo/reporting dash`, branch `china-edition-v2`, HEAD `1782283`.
- **Date:** 2026-10-16.
- **Scope:** read-only. No project files were changed.
- **Targets:**
  - **Primary:** A-share companies under the 2024 SSE/SZSE/BSE sustainability reporting guidelines, and A+H / HKEX-listed companies.
  - **Secondary:** SOEs, and exporters exposed to EU CSRD and CBAM.

Legend for maturity:
- **Real:** working end to end against the Neon backend.
- **Real\*:** working, but needs a vendor key or customer credentials.
- **Partial:** working, with material limits.
- **Demo:** static or demo data only.
- **Stub:** catalogue entry or placeholder only.

Items marked **[uncertain]** could not be confirmed.

Note: a separate prototype exists at `/Users/kick/Desktop/Aeiforo/reporting dash copy` (branch `china-edition`, commit `d56c558`). It is a different, mock-data frontend. It has a region workspace layer, a regulatory calendar, WeCom/DingTalk/Feishu SSO and SMS login screens, ChainMaker/BSN and OSS-WORM settings, and `src/data/regulatory.ts`. It has no backend. Treat it as a UX reference to port, not as shipped capability.

---

## 0. Executive summary

**What Nexus already has.** Its core is unusually broad for its stage:
- a multi-framework questionnaire engine: 19 global frameworks with 2,695 items, plus 4 China packs with about 245 items
- a linked-concept propagation engine
- a Workiva-style disclosure editor with realtime presence
- a preparer → reviewer → approver workflow
- a double-materiality module with IROs and stakeholder input
- PCAF financed emissions
- a rules-based anomaly engine
- a hash-chained audit log with OpenTimestamps anchoring
- public verification links and auditor upload links
- SCIM, SAML and MFA
- a full Simplified Chinese UI (about 5,400 keys)

**China blockers.** None of these is a feature gap. They block a mainland launch outright:
1. **AI depends on Anthropic.** `api/_claude.ts` is Anthropic-only. Anthropic's usage policy has barred Chinese-controlled entities since Sep 2025, and the API cannot be reached from the mainland. That rules it out for A-share customers and for most A+H customers. https://www.medianama.com/2025/09/223-anthropic-service-policy-update-bans-ai-access-chinese-firms/
2. **Generated PDF reports cannot render Chinese.** `api/_reportPdf.tsx` uses Helvetica with no CJK font registered. The report generator's `frameworkMap` (`api/_reportGenerator.ts:52`) also has no `cn-sse`, `hkex-esg` or `cn-csds` entries.
3. **Every runtime dependency is offshore:** Vercel, Neon, WorkOS, Resend, Liveblocks, Sentry, the Spline CDN, Google Fonts and the OpenTimestamps calendars. `organisations.region` only allows `us`, `eu` or `apac` (`api/setup.ts:62`).
4. **The China grid factor is stale.** The code seeds MEE 0.5703 tCO₂/MWh (2022 data, from the Feb 2023 notice). MEE/NBS have since published the 2023 factors:
   - 0.5306 national average (location-based)
   - 0.6096 national excluding market-traded non-fossil power, the market-based residual for green-power accounting
   - regional factors

   https://www.mee.gov.cn/ywdt/zbft/202601/t20260105_1139911.shtml
5. **The China-specific operational modules don't exist.** There is no green-certificate (绿证) or green-power instrument ledger, no CCER or carbon-credit disclosure, no national carbon market MRV, no MEE environmental-information disclosure (企业环境信息依法披露) export, no supplier portal, and no ESG-rating improvement module (中证/Wind/华证/MSCI). The China connectors are catalogue-only.

**Where Nexus can win.** No global leader has a China-native offering:
- Workiva, Sweep, Watershed, Persefoni and Envizi show no mainland product.
- Domestic players split into three groups:
  - raters and data vendors (Wind, 华证, 中证, 商道融绿, 秩鼎) with little authoring tooling
  - carbon specialists (碳阻迹 Carbonstop, Alibaba Energy Expert, Univers EnOS Ark) that are weak on governed report authoring
  - CCX-MioTech (中诚信妙盈), the most direct threat: it launched an AI ESG report-writing agent and an MCP service in Sep 2026

Nexus's whitespace is **governed, auditable, bilingual report production**:
- the SSE/SZSE 21-topic, four-element double-materiality structure
- A+H dual output (Guideline 14 plus HKEX Part D / HKFRS S2)
- an evidence trail that assurors (鉴证机构) can verify
- rating-uplift analytics
- all of it running on domestic LLMs and domestic cloud

**Recommended sequence:**

| Phase | Weeks | What it delivers |
|---|---|---|
| A — CN launch blockers | about 6–10 | LLM abstraction plus Qwen/DeepSeek; CJK reports and the SSE report template; factor update and the green-power ledger; `cn` region with China-safe dependency swaps; SSE double-materiality mapping; deadline calendar |
| B — parity | about 10–16 | supplier portal; rating-uplift module; A+H concept mapping; real assurance workspace; first live CN connectors; server-side calculation parity |
| C — differentiators | ongoing | CBAM and product-footprint exports; carbon-market MRV; environmental-disclosure export; agentic report writer and MCP; private deployment |

Legal and infrastructure work runs in parallel and is on the critical path:
- B25 ICP licence or a partner entity
- mainland hosting
- MLPS (等保) Level 3
- PIPL
- CAC registration of the generative AI app (生成式AI应用登记)
- blockchain information-service filing (区块链信息服务备案)

---

## 1. Capability inventory (what is actually in the code)

| # | Capability | Evidence | Maturity | Notes |
|---|---|---|---|---|
| 1 | Auth: JWT, bcrypt, password reset | `api/auth/*`, `api/_auth.ts` | Real | |
| 2 | TOTP MFA with recovery codes (AES-GCM) | `api/auth/mfa/*`, `api/_crypto.ts`, `src/components/MfaSection.tsx` | Real | |
| 3 | SAML SSO with domain discovery | `api/auth/sso/*`, `api/_workos.ts`, `api/admin/sso.ts` | Real\* | Needs a WorkOS key. WorkOS is not usable from the mainland. No WeCom, DingTalk or Feishu OAuth, and no SMS login. |
| 4 | SCIM 2.0 provisioning | `api/scim/v2/*`, `api/_scim.ts`, `src/pages/ScimTokens.tsx` | Real | Azure AD and Okta. |
| 5 | RBAC: 5 system roles, permission matrix, API keys | `api/roles`, `api/permissions`, `api/admin/api-keys.ts`, `src/lib/rbac.ts` | Real | |
| 6 | Org tree (group, BU, subsidiary, plant), members, equity %, assignments | `api/org.ts` (2,138 lines, ~40 actions), `src/lib/orgStore.ts`, `OrgOnboarding.tsx` | Real | No API-backed org profile: ICP number, listing venue, stock code and region cannot be stored. |
| 7 | Framework catalogue and questionnaire seeds: GRI, ESRS E1–G1, ISSB S1/S2, TCFD, CDP 2024, SEC, SB 253/261, EU Taxonomy | `api/_*Seed.ts`, `src/lib/frameworks.ts`, `docs/PLATFORM.md` | Real | 2,695 items. |
| 8 | China packs: `cn-sse` (93 items, all 21 topics), `cn-csds` (43), `hkex-esg` (77), `cass-esg` (41) | `api/_cnSseSeed.ts`, `_cnCsdsSeed.ts`, `_hkexEsgSeed.ts`, `_cassEsgSeed.ts`, `src/test/unit/cn-framework-seeds.test.ts` | Real (content partial) | Opt-in per org. CSDS climate text is flagged "uncertain" but has been final since Dec 2025 (财会〔2025〕34号). Section headings are English-only. SSE preparation guides No. 3–5 (pollutants, energy, water calculation methods) are not reflected. |
| 9 | Linked-data concept mapping and propagation | `api/_conceptSeed.ts`, `api/_propagate.ts`, `api/concept-mappings.ts`, `LinkedDataPanel.tsx` | Real | No mappings yet between `cn-sse`, `hkex-esg`, `issb` and `cn-csds`. |
| 10 | Disclosure editor (3-pane, spreadsheet keys, autosave) with Liveblocks presence | `src/pages/DisclosureEditor.tsx`, `components/disclosure-editor/*`, `api/liveblocks-auth.ts` | Real\* | Liveblocks is an offshore SaaS. It degrades to "solo mode". |
| 11 | Spreadsheet data entry and Excel import | `DataEntrySpreadsheet.tsx`, `components/spreadsheet`, `ExcelImport.tsx` (hyperformula, exceljs) | Real | |
| 12 | Workflow: preparer → reviewer → approver, queues, calendar, MyDay, MyTasks | `api/_workflow.ts`, `api/workflow`, `WorkflowQueue.tsx`, `MyTasks.tsx`, `WorkCalendar.tsx` | Real | No board-approval or e-seal step. |
| 13 | Comments and notifications: in-app, email, DingTalk/Feishu/WeCom group bots | `api/notifications.ts`, `api/_email.ts` (Resend), `api/_notifyChannels.ts` | Real\* | IM webhooks are global environment variables allow-listed by org. There is no per-org configuration. |
| 14 | Evidence library and AI evidence extraction (vision) | `EvidenceLibrary.tsx`, `api/ai/extract-evidence.ts`, `accept-extraction.ts` | Real\* | Anthropic only. |
| 15 | GHG calculators: Scope 1 fuel, Scope 2 electricity, all 15 Scope 3 categories, intensity/HR KPIs | `src/calculators/registry.ts`, `src/calculators/scope3/cat01…cat15` | Partial | Calculation runs client-side. The server re-computes only Cat 1, 6 and 7, with hard-coded factors (`api/calculators/compute.ts`). Other categories return 501, which is weak for auditability. |
| 16 | Emission-factor library (DB, versioned): DEFRA, EPA, IPCC, IEA, IMO, plus CN GB/T 32150 fuels and the MEE grid factor | `api/setup.ts`, `api/_efCnFactors.ts`, `api/emission-factors.ts`, `EFLibrary.tsx` | Partial | CN grid factor is stale (0.5703). No 0.6096 residual factor, no regional or provincial factors, and an IEA vs MEE preference conflict. GWP seeds are AR5; IFRS S2 expects the latest IPCC report (AR6). |
| 17 | AI vendor → emission-factor matcher | `api/ai/match-ef.ts`, `accept-ef-match.ts` | Real\* | Anthropic only. |
| 18 | AI drafting | `api/ai/draft.ts`, `api/_claude.ts`, `AIReport.tsx` | Partial | `framework` enum is only `gri`, `csrd`, `tcfd`, `cdp`, `issb`. No CN or HKEX support, no language control (zh), no AI-content labelling. |
| 19 | AI gap analysis and anomaly narration | `api/ai/analyze-gaps.ts`, `api/ai/narrate-anomaly.ts` | Real\* | Anthropic only. |
| 20 | Anomaly detection: 9 rules (YoY, z-score, unit change, missing evidence, peer deviation, and others) | `api/_anomalies.ts`, `AnomalyDetection.tsx` | Real | A strong, auditor-friendly feature. |
| 21 | Double materiality: topics with impact and financial scores, IROs, stakeholder ratings, threshold, finalisation | `api/materiality/index.ts`, `api/org.ts` (finalize), `Materiality.tsx` | Real | Not mapped to the SSE rule that financially material topics need full four-element disclosure. Not linked to the 21 SSE topics. |
| 22 | Climate targets: SBTi near- and long-term, custom | `ClimateTargets.tsx`, `org_targets` | Real (basic) | No pathway or MACC modelling, and no scenario analysis. |
| 23 | Reporting periods and lifecycle | `ReportingPeriods.tsx`, `api/org.ts` (create/transition-period) | Real | No regulatory deadline engine. |
| 24 | Group roll-up (equity / operational control) | `GroupRollup.tsx`, `src/lib/rollup.ts` | Real | |
| 25 | PCAF financed emissions, all asset classes, syncs to Scope 3 Cat 15 | `api/pcaf/*`, `PcafPortfolio.tsx`, `docs/PCAF.md` | Real | |
| 26 | Report publishing: PDF, DOCX, artefact store, share links, public report, verify page | `api/_reportGenerator.ts`, `_reportPdf.tsx`, `_reportDocx.ts`, `ReportPublishing.tsx`, `PublicReport.tsx`, `VerifyReport.tsx` | Partial | No CJK fonts in the PDF, and `frameworkMap` lacks CN frameworks. There is no Chinese report template (structure, index table, board statement). |
| 27 | Sustainability performance report (data tables) | `SustainabilityPerformanceReport.tsx` | Demo | Reads `DEMO_REPORT`. |
| 28 | iXBRL: 280+ hand-built ESRS, ISSB, SEC, GRI and EU-Taxonomy concepts; generate and structural validate | `api/_ixbrl.ts`, `_ixbrlTaxonomy.ts`, `api/ixbrl/*`, `IXBRLPreview.tsx` | Partial | Not validated against the official EFRAG/IFRS taxonomies; certified validation is left to a partner. Not needed for SSE, SZSE or HKEX ESG filings (PDF). |
| 29 | Audit log (hash-chained) and OpenTimestamps Bitcoin anchoring with downloadable `.ots` | `api/_hashChain.ts`, `api/_audit.ts`, `api/blockchain/index.ts`, `BlockchainAudit.tsx` | Real | Bitcoin anchoring is a poor fit for mainland compliance (see §5). |
| 30 | Assurance: request or withdraw assurance, tokenised auditor upload, read-only auditor view | `api/org.ts` (request-assurance), `AuditorUpload.tsx`, `AuditorView.tsx` | Real | |
| 31 | Assurance review workspace, entity submissions, measured data | `AssuranceReview.tsx`, `EntitySubmissions.tsx`, `MeasuredData.tsx` | Demo | Reads `src/data/moduleData`. |
| 32 | Supplier and subsidiary raw-file ingestion | `RawSupplierIngestion.tsx` | Demo / partial | Parses and maps files client-side and persists nothing. No supplier portal, invitations or questionnaires. |
| 33 | Connectors: SAP S/4HANA, NetSuite, Oracle Fusion, Workday, Salesforce, Snowflake, AWS/Azure/GCP carbon, generic REST; OAuth; sync runs; CSV templates | `api/_connectors/*`, `api/connectors/*`, `Connectors.tsx`, `docs/CONNECTORS.md` | Real\* | Needs customer credentials. |
| 34 | CN connectors: Kingdee, Yonyou BIP, DingTalk HR, Feishu, WeCom, Aliyun IoT, State Grid metering, national carbon-market export | `api/_connectors/providers/cnCatalogue.ts`, `comingSoon.ts` | Stub | Catalogue only, never connectable. |
| 35 | Data residency (per-tenant DB routing) | `api/_db.ts`, `docs/REGIONS.md` | Partial (scaffold) | `us`, `eu`, `apac` only. No `cn`, and no migration tooling. |
| 36 | GDPR export and account deletion | `api/admin/export.ts`, `docs/DATA_EXPORT.md` | Real | No PIPL-specific flows (consent records, cross-border notice). |
| 37 | Simplified Chinese UI | `src/i18n/locales/zh/*.json` (~5.4k keys), `src/lib/itemLabel.ts` | Real | Glossary and section headings are still English. |
| 38 | Mainland front-end reachability | `index.html` (non-blocking Google Fonts, CJK system fallbacks) | Partial | `SplineScene` fetches from the Spline CDN. Vercel hosting is not ICP-filed. |
| 39 | Tests | `src/test` (20 unit, 13 component, 1 smoke), `e2e` (5 Playwright specs) | Real (thin) | |
| 40 | Missing entirely | — | None | Scenario analysis / physical risk; transition-plan modeller; supplier engagement network; ESG-rating module; CCER / carbon-credit ledger; green-power / green-certificate ledger; national carbon market MRV; MEE environmental-disclosure export; product carbon footprint / LCA; CBAM; battery passport; peer benchmarking; e-seal; private deployment package; domestic LLMs; MCP / public data API docs for agents. |

---

## 2. Market research summary

### 2.1 Global leaders

| Vendor | Core strengths | AI | Assurance / XBRL | China |
|---|---|---|---|---|
| **Workiva** | Unified financial, GRC and ESG platform with linked data. Workiva Carbon (Jun 2024) covers Scope 1–3, supplier surveys and SB 253/261. [esgnews](https://esgnews.com/workiva-unveils-carbon-management-platform/) | Agentic AI (Sep 2025): materiality, peer benchmarking, ISSB disclosure drafting, ESRS IRO analysis, consistency checks. [esgtoday](https://www.esgtoday.com/workiva-launches-new-agentic-ai-platform-for-sustainability-finance-grc-solutions/) | XBRL International Sustaining Partner; the iXBRL/ESEF leader. [xbrl.org](https://www.xbrl.org/?p=9714) | None found [uncertain]. |
| **Sweep** | CSRD double materiality, data management, Scope 1–3, supplier engagement, CSRD/ISSB/GRI/CDP/SB 253. [sweep.net](https://sweep.net/platform) | "Sweepy" agent orchestration with a human in the loop. [verdict](https://www.verdict.co.uk/qa-sweeps-ceo-on-how-ai-can-help-navigate-sustainability-reporting/) | Audit trails. Leader in IDC 2026 and Verdantix 2026 (vendor claim). | None. |
| **Persefoni** | Scope 1–3 (all 15 categories), PCAF. Free Pro tier and quote-based Advanced tier. [rfp.wiki](https://www.rfp.wiki/sustainability-esg/persefoni) | Copilot and anomaly detection. | Audit-grade ledger. | None. |
| **Watershed** | Enterprise carbon accounting, supplier decarbonisation, multi-framework reporting, PCAF finance module, AI product footprints (GA 2026). [watershed](https://watershed.com/en-AU/blog/product-updates-q3-25) | AI agents for data cleaning (finance). | Assurance-ready lineage is its main reviewer praise. | None. |
| **IBM Envizi** | CSRD workflow, verifier access, ESRS/GRI/SASB/SFDR/TCFD. [esgnews](https://esgnews.com/ibm-enhances-esg-data-platform-with-csrd-sustainability-reporting-features) | AI Scope 3 with confidence scoring. | Verifier role. | Pulled back; IBM closed its China R&D in 2024. |
| **Microsoft Sustainability Manager** | Templates for CSRD, BRSR, IFRS S1/S2, SASB. | Copilot, English only. [MS Learn](https://learn.microsoft.com/id-id/industry/sustainability/sustainability-manager-copilot-overview) | — | Availability on 21Vianet doubtful [uncertain]. |
| **SAP SFM / Control Tower** | ERP-native footprints, 45k factors, PACT supplier exchange. [sap.com](https://www.sap.com/products/scm/sustainability-footprint-management/features.html) | Business AI factor mapping. | — | Strong ERP base in China; SFM availability [uncertain]. |
| **Greenly + Normative** | Merged Sep 2026 (about €64M), more than 4k customers. Entry pricing about $2k per user per year. [esgtoday](https://esgtoday.com/greenly-acquires-normative-as-carbon-accounting-consolidation-accelerates) | — | — | None. |
| **Plan A** | Mid-market decarbonisation; acquired by Diginex (Jan 2026). | — | — | None. |

**Global context:**
- **EU Omnibus I (Directive 2026/470):** narrows CSRD to companies with more than 1,000 employees and at least €450M turnover. Simplified ESRS expected around Q4 2026. [HSF Kramer](https://www.hsfkramer.com/notes/esg/2026-posts/omnibus-i-update-csrd-and-csddd-amendment-directive-published-in-the-official-journal)
- **California:** SB 253 first reports due 10 Aug 2026; SB 261 enjoined since Nov 2025. [Cooley](https://www.cooley.com/news/insight/2026/2026-01-26-californias-sb-253-and-sb-261-developments-and-litigation)

**What table stakes look like among the leaders:**
- agentic AI drafting with human review
- supplier engagement networks
- assurance-grade lineage
- PCAF
- product footprints
- multi-framework reuse of one dataset

### 2.2 China players

| Player | Type | What they offer | Implication for Nexus |
|---|---|---|---|
| **CCX-MioTech 中诚信妙盈** (merger of 中诚信绿金 and 妙盈科技; Hong Kong launch 1 Sep 2026) | Ratings, data, SaaS, AI | AI ESG report-writing agent (data preparation → structure → drafting → compliance review → translation); MCP service exposing company ESG data and indicator logic to clients' agents; ESGhub platform; supply-chain and carbon tools. [cnfin](https://www.cnfin.com/zs-lb/detail/20260902/4464021_1.html) | The closest full-stack rival. It has a rating brand plus AI. Nexus must match the AI report agent and MCP, and differentiate on governed workflow, audit trail and A+H. |
| **Carbonstop 碳阻迹** | Carbon SaaS and consulting | 碳云 platform; CCDB factor database (more than 150k factors); AI Copilot for CDP; AI ESG report drafting; rating improvement for MSCI, CSA, CDP and EcoVadis; product footprints, carbon labels, SBTi. [carbonstop](https://carbonstop.com/esgservices) | The benchmark for China factor depth and rating-uplift services. "KAPOK" product name not confirmed [uncertain]. |
| **SynTao 商道融绿** | Rater and data provider | STaR ESG data platform, risk radar, S-ESG solutions for financial institutions. [nbd](https://www.nbd.com.cn/articles/2022-05-29/2300268.html) | A rater to map to, not an authoring competitor. |
| **Wind ESG** | Rater and terminal | All A-shares and HK. 3 dimensions, 27 issues, 400+ indicators, AAA–CCC. [methodology](https://esg.wind.com.cn/WindESGRating/assets/doc/WindESGRatingMethodologyZH.pdf) | Its methodology is public, so a rating-uplift mapping is feasible. |
| **华证 (Sino-Securities)** | Rater | C–AAA, quarterly, all A-shares. [cs.com.cn](https://www.cs.com.cn/ssgs/01/2026/07/16/detail_2026071610024900.html) | Rating-uplift target. |
| **中证 (CSI)** | Exchange-owned rater | Used by the social security fund and by ESG ETFs. The SSE action plan promotes it. | Highest-value domestic uplift target. |
| **秩鼎, RKS 润灵, CNRDS** | Raters and academic data | Peer-ranked ratings (秩鼎); CSI 800 ratings (RKS); research databases (CNRDS). | Benchmark and peer data sources [uncertain on licensing]. |
| **Univers EnOS Ark** (Envision) | AI decarbonisation SaaS | IT/OT energy, water and carbon data; Ark 2.0 natural-language interface; TÜV SÜD ISO 14064-3. [prnewswire](https://tools.prnewswire.com/en-us/live/20823/release/20251002EN89205) | Strong on metering and IoT, weak on disclosure governance. |
| **Alibaba Cloud Energy Expert 能耗宝** | Cloud carbon | Meter ingestion (MQTT/Modbus), carbon inventory, product footprints, open APIs. [aliyun](https://help.aliyun.com/zh/energy-expert/use-cases/best-practices) | A partner or connector, not a competitor. Natural on Alibaba Cloud. |
| **Yonyou 用友 CeO** | ERP add-on | ERP-fed Scope 1–3 accounting to ISO 14064 and IFRS S2. [yonyou](https://www.yonyou.com.hk/?p=244691) | A connector target. Also competes for SOEs on Yonyou. |
| **Kingdee 金蝶** | ERP | Low-carbon supply chain only [uncertain]. | Connector target. |
| **Long tail** (青绿 / 青益ESG云 etc.) | Lightweight SaaS | SSE, SZSE and HKEX templates; semi-automated report outlines. Price bands under ¥100k, ¥100–200k and ¥300k+ per year. [sohu, low reliability](https://www.sohu.com/a/1069031507_120815119) | Sets the price anchor for mid and small caps. |

### 2.3 What Chinese listed companies need operationally

1. **SSE/SZSE/BSE guidelines (2024).**
   - **Basis:** issued 12 Apr 2024 and effective 1 May 2024 (SSE Guideline No. 14: 6 chapters, 63 articles).
   - **Mandatory scope:** constituents of the SSE 180, STAR 50, SZSE 100 and ChiNext indices, plus A+H and other dual-listed companies.
   - **Timing:** first report covers FY2025 and was due by **30 Apr 2026**. Afterwards, within 4 months of year-end, board-approved and released with the annual report.
   - **Structure and materiality:** four elements (governance, strategy, IRO management, metrics and targets). Topics that are financially material need the full four-element treatment; topics that are only impact-material use the topic articles.
   - **Topics:** 21. Climate is the largest topic: Scope 1+2 mandatory, Scope 3 encouraged, carbon credits used must be disclosed.
   - **Transition relief:** qualitative financial effects allowed for FY2025–26; no comparatives in the first year.
   - **Preparation guides:** No. 1 (general) and No. 2 (climate) issued 17 Jan 2025. No. 3–5 (pollutants, energy, water calculation methods) followed in Jan 2026.
   - **Outcomes:** FY2025 was the first mandatory year. 2,718–2,720 A-share reports (about 49%); the mandatory group was 100% compliant; 37% disclosed GHG emissions.

   Sources: [SSE](https://www.sse.com.cn/aboutus/mediacenter/hotandd/c/c_20240412_10753197.shtml), [Zhong Lun](https://www.zhonglun.com/research/articles/52735.html), [SSE guides](https://www.sse.com.cn/aboutus/mediacenter/hotandd/c/c_20250117_10770282.shtml), [Xinhua](https://www.news.cn/20260518/d1a42b8a20dc4308967b370dc25359d6/c.html).
2. **MOF CSDS.**
   - **Basic Standard:** 财会〔2024〕17号, Dec 2024.
   - **Climate No. 1:** 财会〔2025〕34号, Dec 2025.
   - **Open consultation:** climate application guide plus **9 industry guides** (power, steel, coal, oil, fertiliser, aluminium, hydrogen, cement, autos), open until 26 Oct 2026.
   - **Status:** voluntary until application rules are set; unified system targeted by 2030.

   Sources: [cs.com.cn](https://www.cs.com.cn/xwzx/hg/202412/t20241217_6461663.html), [10jqka](https://news.10jqka.com.cn/20260930/c680417869.shtml).
3. **HKEX Appendix C2.**
   - **Climate requirements:** Part D, based on IFRS S2, applies from FY2025.
   - **Scope 1 and 2:** mandatory for all issuers.
   - **Scope 3:** Hang Seng Composite LargeCap constituents are mandatory from FY2026 (first reports in 2027), including Scope 3 with relief.
   - **HKFRS S1/S2:** effective Aug 2025 on a voluntary basis. Full adoption by large publicly accountable entities is expected by 2028.
   - **Filing:** PDF via HKEXnews, no ESG XBRL [uncertain].

   Sources: [Linklaters](https://sustainablefutures.linklaters.com/post/102l784/esg-quick-guide-hong-kong-sar-climate-disclosure-rules-under-hong-kong-listing), [Deloitte](https://www.deloitte.com/cn/en/services/audit-assurance/perspectives/roadmap-on-sustainability-disclosures-in-hk-and-hkrfs-s1-and-s2.html).
4. **MEE.**
   - **National carbon market:** power, plus steel, cement and aluminium (2025), about 3,500 entities. [Xinhua](https://www.news.cn/fortune/20260915/523e386bdcb04372aff6d0de9319d43b/c.html)
   - **Power sector MRV:** guideline CETS-AG-01.01-V04-2026. Under 环办气候函〔2026〕237号 (Jun 2026), purchased electricity was removed from covered emissions and became a supplementary reporting item. [MEE](https://www.mee.gov.cn/xxgk2018/xxgk/xxgk06/202606/W020260629673485282202.pdf)
   - **Grid factors (2023 data):** 0.5306 national, 0.6096 residual, 0.8273 fossil-only, plus regional factors. [MEE](https://www.mee.gov.cn/ywdt/zbft/202601/t20260105_1139911.shtml)
   - **Environmental-information disclosure (企业环境信息依法披露):** annual filing in the provincial system, which is open 1 Jan–15 Mar. [MEE](https://www.mee.gov.cn/xxgk2018/xxgk/xxgk05/202201/t20220110_966488.html)
   - **CCER:** relaunched Jan 2024, 18 methodologies.
   - **Green certificates (绿证):** sole proof of renewable environmental attributes since Aug 2023, with mandatory consumption coming for heavy industry and data centres. [Yicai](https://www.yicai.com/news/102514598.html)
5. **Product footprints and exports.**
   - **China PCF system:** about 100 product rules by 2027. [cs.com.cn](https://cs.com.cn/esg/202406/t20240606_6415315.html)
   - **EU CBAM:** definitive period from 1 Jan 2026; first declaration due 30 Sep 2027. Installation-level embedded-emissions data is requested from Chinese exporters. [osapiens](https://osapiens.com/en/regulations/cbam)
   - **EU battery passport:** due 18 Feb 2027.
6. **ESG ratings.**
   - **SSE action plan (Jun 2025):** promotes rater communication and 中证/MSCI improvement. [SSE](https://www.sse.com.cn/aboutus/mediacenter/hotandd/c/c_20250619_10782405.shtml)
   - **Results so far:** 21% of A-shares have had CSI upgrades; the share of MSCI China A companies rated AA or AAA rose from 7.2% to 14%.
   - **What buyers want:** rater-specific gap analysis and response support.
7. **SaaS compliance.**
   - **Licensing:** paid SaaS needs a B25 ICP operating licence. Foreign ownership is capped at 50%; an Apr 2024 pilot lifts this for some services. [China Briefing](https://www.china-briefing.com/news/china-internet-business-licenses-foreign-companies/)
   - **Cross-border data:** 2024 rules set thresholds of 100k and 1M people for personal information sent abroad. [CLT](https://www.chinalawtranslate.com/促进和规范数据跨境流动规定/)
   - **Security:** MLPS (等保) Level 3 is expected by SOE and listed buyers [uncertain/memory].
   - **Generative AI:** apps that call a filed model must be registered (登记) and show the model name and filing number. AI-content labels have been mandatory since 1 Sep 2025. [Xinhua](https://www.news.cn/politics/20250314/b7a24028f2924b7681e6ed1bfbd8fade/c.html)
   - **Workplace integration:** WeCom, DingTalk and Feishu SSO and approvals; e-seals (e签宝, 法大大, 契约锁); fully digital e-invoices (数电票); private (私有化) deployment for SOEs [memory].

---

## 3. Gap matrix

Columns: **Nexus** (current state) · **Global leaders** · **China players** · **China-market need** · **Priority**.

Priority key:
- **M** = Must for CN launch
- **P** = Competitive parity
- **D** = Differentiator
- **L** = Later

| Capability | Nexus | Global leaders | China players | CN need | Priority |
|---|---|---|---|---|---|
| SSE/SZSE/BSE 21-topic question set | Real, 93 items | None | Long-tail SaaS has templates; MioTech/Carbonstop via services | Mandatory for the target segment | **M** (already ahead; update content for guides No. 3–5) |
| Four-element double materiality tied to SSE topics | DMA module exists, not tied to SSE | Strong for ESRS (Sweep, Workiva) | Mostly consulting | Core of the guideline | **M** |
| Chinese-language report output (PDF/Word) in SSE structure with index table | PDF cannot render CJK; no CN template | n/a | Yes (AI drafting) | Must file a Chinese report | **M** |
| AI drafting on domestic LLMs with AI-content labelling | Anthropic only; no CN frameworks | Multi-LLM, agentic | MioTech agent, Carbonstop AI | Legally required route | **M** |
| China emission factors (MEE 2023 national/residual/regional, provincial, GB/T fuels) | Partial, stale | Global databases only | Carbonstop CCDB (150k) | Scope 2 must match MEE | **M** |
| Green-power and green-certificate instruments, market-based Scope 2 | Missing | Generic REC/EAC support | Partial | Mandatory green-certificate consumption expanding | **M** |
| Carbon credits / CCER usage disclosure | Missing | Offsets modules | Carbonstop | SSE climate article requires it | **M** (S-size) |
| Regulatory calendar (SSE 4 months, HKEX, MEE 15 Mar, carbon market 31 Mar, CDP) | Periods only | Partial | Partial | Synced with the annual report timetable | **M** |
| Mainland hosting, `cn` region, offshore dependencies replaced | None | None | Native | Hard requirement | **M** |
| WeCom/DingTalk/Feishu SSO, approvals, per-org IM | IM bots via env only; SSO missing | n/a | Common | Expected by buyers | **M** (SSO + per-org bots) / **P** (approvals) |
| HKEX Part D / HKFRS S2 and A+H dual output via concept mapping | Seed exists, no mapping | ISSB yes | Partial | 188+ A+H companies mandatory | **P** (high) |
| MOF CSDS Climate No. 1 and industry guides | Seed (40 items), text flagged uncertain | None | Few | Voluntary now, mandatory later | **P** |
| Supplier engagement portal and questionnaires | Missing (client-side parse only) | Strong (Watershed/EcoVadis, Normative network, Workiva) | MioTech supply chain, 绿链 | Supply-chain security topic; CBAM data requests | **P** |
| ESG-rating uplift module (中证, Wind, 华证, MSCI, CSA, CDP, EcoVadis) | Missing | Partial (Workiva peer benchmarking) | Carbonstop service, raters | High buyer pull (SSE action plan) | **D** (sells in CN) |
| Server-side, auditable calculation engine with DB factors for all categories | Cat 1/6/7 only, hard-coded | Yes | Yes | Assurors require it | **P** |
| Assurance workspace (PBC list, sampling, findings) | Request and upload real; review page demo | Workiva/Envizi verifier access | Weak | Third-party assurance growing | **P** |
| Hash-chained audit and external anchoring | Real (OpenTimestamps) | Lineage, not chained | Some blockchain evidence (ChainMaker) | Valued; must use compliant chain or TSA | **D** (swap anchor) |
| Anomaly detection | Real | Persefoni, Watershed | Some | Data quality | Parity reached |
| Live CN ERP, HR and energy connectors (Kingdee, Yonyou, State Grid, Aliyun IoT) | Stub | SAP/Oracle-centric | Native | Reduces manual entry | **P** |
| Energy calculations per SSE Guide No. 4 (comprehensive energy consumption in tonnes of coal equivalent, GB/T 2589) and water and pollutants per No. 3/5 | Missing | n/a | Carbonstop / Energy Expert | Guides issued Jan 2026 | **P** (near-M) |
| MEE environmental-information disclosure annual report export | Missing | n/a | Few | Mandatory for key dischargers and violators | **P** (SOE/industrial) |
| National carbon market MRV (power, steel, cement, aluminium monthly data, verification) | Stub (export catalogue) | n/a | Specialists | About 3,500 covered entities | **L** for listed-company launch; **D** for heavy industry |
| Scenario analysis / physical and transition risk | Missing | Partial (Watershed, Persefoni via partners) | Few | Encouraged (SSE), HKEX Part D | **P** (lite) / **L** (full) |
| Transition plan and target pathway modelling | Basic targets | Strong | Few | Strategy element | **P** |
| Product carbon footprint (ISO 14067) and CBAM installation reports | Missing | Watershed PCF, SAP SFM | Carbonstop, Energy Expert | Exporters from 2026 | **D** (secondary segment) |
| Battery passport | Missing | Specialists | Few | Battery exporters 2027 | **L** |
| PCAF financed emissions | Real | Persefoni, Watershed | Few | Banks and insurers | Parity reached |
| Agentic AI report writer and MCP data service | Single-shot drafting | Workiva/Sweep agents | MioTech agent and MCP (Sep 2026) | Strong pull | **D** |
| Peer benchmarking from published A-share and HK reports | Missing | Workiva AI benchmarking | Raters' data | Strong pull | **D** |
| iXBRL / ESEF | Partial | Workiva leads | n/a | Not required for SSE/HKEX ESG | **L** (EU subsidiaries only) |
| E-seal and board-approval sign-off record | Missing | n/a (DocuSign) | Common | Board approval is mandatory | **P** |
| Private deployment (Docker/Helm) for SOEs | Missing | Rare | Common | SOEs and financial institutions | **D/L** |
| PIPL consent, data export and cross-border controls | GDPR export only | GDPR | Native | Legal | **M** (code part S) |
| Chinese glossary, `subsection_zh`, native regulatory proofreading | Partial | n/a | Native | Credibility | **M** (S) |

---

## 4. Scoped build list for this codebase

Sizes: **S** ≤ 1 week, **M** 1–3 weeks, **L** more than 3 weeks (one engineer). IDs are stable so they can become tickets.

### Phase A: Must for CN launch

**A1. LLM provider abstraction with domestic models** (M)
- **What:**
  - Create `api/_llm.ts` with a `LlmProvider` interface covering `complete`, `toolCall` and `vision`.
  - Providers: `anthropic` (existing, from `api/_claude.ts`), `qwen` via Alibaba Bailian/DashScope (OpenAI-compatible endpoint), and `deepseek`.
  - Pick the provider per org from the region (`cn` → `qwen` by default), with an override in an org setting.
  - Keep the structured-output tool schemas, falling back to JSON mode where tool calling differs.
  - Use Qwen-VL for evidence extraction.
- **Plugs into:**
  - `api/_claude.ts`, which becomes the Anthropic adapter
  - `api/ai/draft.ts`, `extract-evidence.ts`, `match-ef.ts`, `analyze-gaps.ts`, `narrate-anomaly.ts`
  - `src/test/unit/ai-*-schema.test.ts`
- **Also:**
  - Extend the `draft.ts` framework enum to `cn-sse`, `cn-csds`, `hkex-esg` and `cass-esg`, with Chinese system prompts using regulator terminology (治理/战略/影响、风险和机遇管理/指标与目标; 财务重要性/影响重要性).
  - Add a `language: 'zh'|'en'` parameter.
  - **AI-content labelling:** an explicit badge in the UI and exported documents, plus an implicit label in DOCX/PDF metadata and the `ai_extractions` row, following the Sep 2025 labelling measures. Show the model name and its filing number.
- **Depends on:** a DashScope/DeepSeek account. The legal item "GenAI app registration" (§5) must be in place before public launch.

**A2. Chinese report output: SSE template, CJK PDF and DOCX** (M)
- **What:**
  - Register a subset of Noto Sans SC / Source Han Sans with `Font.register` in `api/_reportPdf.tsx`, and switch the font family by language. Bundle the font file in the function; watch the function size limit.
  - Set the east-Asian font (`eastAsia`) in `api/_reportDocx.ts`.
  - Add CN entries to `frameworkMap` in `api/_reportGenerator.ts`. Better, read names from `src/lib/frameworks.ts`, or move that data server-side.
- **New SSE-structured template** (`src/reports/cnSseTemplate.ts` plus a generator branch):
  - 董事会声明 (board statement) and report basis
  - double-materiality process and topic list/matrix
  - four elements for financially material topics
  - topic articles for impact-only topics
  - 指标索引表 (index table: guideline article → page/section)
  - an HKEX Appendix C2 content index for A+H issuers
- **Also:**
  - Replace `DEMO_REPORT` in `SustainabilityPerformanceReport.tsx` with real `data_value` queries.
  - Add a `subsection_zh` column alongside `line_item_zh` (CHINA_EDITION.md open decision 4).
- **Depends on:** A6 for the materiality data.

**A3. China emission factors and Scope 2 market-based method** (S–M)
- **What:**
  - Update `api/_efCnFactors.ts` with:
    - MEE/NBS 2023 national 0.5306 (location-based)
    - 0.6096 residual (market-based)
    - 0.8273 fossil-only
    - regional factors (North 0.6361, East 0.5500, South 0.4042, Southwest 0.2472; add the others)
    - provincial factors (e.g. Shanghai 0.4701) with `valid_from` set
  - Keep the 0.5703 carbon-market factor tagged `cn_ets`.
  - Add an EF preference rule: CN orgs prefer `source LIKE 'MEE%'` over IEA (open decision 3). Implement it in the EF lookup in `api/emission-factors.ts` and in the calculators.
  - Add AR6 GWP values alongside AR5, selectable per framework (`GWPValues.tsx`, setup seeds).
- **Depends on:** verifying factor values against the MEE PDF (native reviewer).

**A4. Green-power and green-certificate ledger, plus carbon-credit/CCER ledger** (M)
- **What:**
  - New tables `energy_attribute_certificates` (type: 绿证 GEC / 绿电交易 green-power trade / I-REC; MWh; vintage; facility; certificate ID; evidence) and `carbon_credits` (CCER, CEA, VCS, Gold Standard; t; vintage; retired yes/no; purpose).
  - Scope 2 market-based calculation: certified MWh × 0, remainder × the residual factor.
  - Feed the outputs into the `cn-sse` climate items: credits used, renewable share.
- **Plugs into:**
  - `api/setup.ts` (tables)
  - new `api/instruments.ts`, or actions in `api/org.ts` (watch the Vercel function count)
  - `src/calculators/registry.ts` (`scope-2-electricity`)
  - concept mappings
- **Depends on:** A3.

**A5. Mainland deployment profile: `cn` region and China-safe dependencies** (L, code part)
- **Schema and org profile:**
  - Extend `organisations.region` with `cn` (`api/setup.ts:62`) and add `DATABASE_URL_CN` in `api/_db.ts`.
  - Add an API-backed org profile with ICP number, listing venue (SSE/SZSE/BSE/HKEX), stock code and fiscal year-end (open decision 2).
- **Adapter interfaces for every offshore dependency:**

  | Today | CN replacement |
  |---|---|
  | Email: Resend | Aliyun DirectMail |
  | SSO: WorkOS | WeCom, DingTalk and Feishu OAuth (A7) plus SMS OTP via Aliyun SMS |
  | Realtime: Liveblocks | self-hosted Yjs/y-websocket, or off ("solo mode" already exists) |
  | Errors: Sentry | self-hosted Sentry or Aliyun ARMS |
  | Anchoring: OpenTimestamps | TSA trusted timestamp (RFC 3161 from a licensed CN CA) or a ChainMaker/BSN anchor, behind `anchor_method` in `api/blockchain/index.ts` |
  | `SplineScene` | removed in the CN build |

- **Hosting:** decide how the Vercel serverless handlers (`api/**`) run on Alibaba Cloud: Function Compute, or a single Node/Express container on ACK/ECS. Wrapping the handlers in an Express adapter also ends the 12-function consolidation constraint.
- **Data:** Postgres on ApsaraDB RDS or PolarDB. `@neondatabase/serverless` needs swapping for `pg`/`postgres.js` behind `api/_db.ts`.
- **Depends on:** the §5 hosting, ICP and entity decisions. **Critical path.**

**A6. SSE double-materiality mapping** (S–M)
- **What:**
  - Tag `material_topics` with `cn_sse_topic` (21 enums) plus `materiality_type` (`financial | impact | both`).
  - On finalisation (`api/org.ts` `finalize-materiality`), auto-enable the four-element question blocks only for financially material topics.
  - Export the topic matrix and process narrative for A2.
  - Pre-seed the 21 topics with industry defaults (SW/CSRC industry classification).
- **Plugs into:** `api/materiality/index.ts`, `Materiality.tsx`, `api/_cnSseSeed.ts` (add a topic tag).

**A7. China identity and per-org IM** (M)
- **What:**
  - WeCom, DingTalk and Feishu OAuth login, plus directory sync that reuses the SCIM user model.
  - Per-org webhook configuration: a new `org_notify_channels` table plus an admin UI in `Settings.tsx`, replacing the env-only `NOTIFY_IM_ORG_IDS` (open decision 1).
  - Phase 2: approval cards in DingTalk and Feishu that call back into `api/workflow`.
- **Plugs into:** `api/auth/sso/*` (add providers beside WorkOS), `api/_notifyChannels.ts`, `api/_notify.ts`.

**A8. Regulatory calendar and deadline engine** (S)
- **What:**
  - Derive deadlines from the org profile (listing venue, FY end):
    - SSE/SZSE: within 4 months, with the annual report
    - HKEX: within 5 months
    - MEE environmental disclosure: by 15 Mar
    - carbon market emissions report: 31 Mar [verify the yearly notice]
    - CDP window
  - Auto-create `reporting_periods` milestones and back-schedule assignment due dates.
  - Port the UX from `reporting dash copy/src/data/regulatory.ts`.
- **Plugs into:** `ReportingPeriods.tsx`, `WorkCalendar.tsx`, `MyDay.tsx`, `api/org.ts` `create-period`.

**A9. CN content hardening** (S)
- **What:**
  - Update `_cnCsdsSeed.ts` to the final Climate No. 1 text (财会〔2025〕34号).
  - Add SSE Guide No. 3–5 metric items to `_cnSseSeed.ts`: comprehensive energy consumption, energy intensity, water withdrawal by source, pollutant loads.
  - Check HKEX LargeCap Scope 3 phasing for FY2026.
  - Translate the glossary (`src/data/glossary.ts`).
  - Get a native expert review (open decision 5).

**A10. PIPL basics** (S)
- **What:**
  - A Chinese privacy policy and consent capture with a timestamped record.
  - A PI export and deletion flow (extend `api/admin/export.ts`).
  - A switch that disables offshore telemetry and AI for `cn` orgs.
  - A record of cross-border transfers.

### Phase B: Competitive parity

**B1. Supplier engagement portal** (L)
- **What:**
  - Token-based external supplier workspace, reusing the `AuditorUpload` / `rotate-upload-token` pattern in `api/org.ts`.
  - Questionnaire builder: reuse the `questionnaire_item` model with a `supplier` framework type.
  - Templates: CN supply-chain ESG questionnaire, CDP-supply-chain-lite, and a CBAM installation-data request.
  - Bulk invite with reminders over email, SMS and WeCom.
  - Supplier-specific factors flow into Scope 3 Cat 1/2 calculators.
  - Make `RawSupplierIngestion.tsx` persist via `api/connectors/import.ts`.
- **New:** `supplier`, `supplier_request` and `supplier_response` tables; `src/pages/Suppliers.tsx`; `/supplier/:token` public route in `src/App.tsx` alongside `/assure/:token`.

**B2. ESG-rating uplift module** (M)
- **What:**
  - Build a rater methodology map (`api/_ratingMethodSeed.ts`) for 中证/CSI, Wind (public methodology PDF), 华证, MSCI ESG, S&P CSA, CDP and EcoVadis: indicator → Nexus concept / question.
  - Gap scoring over existing `data_value`: disclosed / partial / missing, weighted.
  - An AI "what moves the score" plan via `api/ai/analyze-gaps.ts` (already exists; add `rater` to the schema).
  - Output: a prioritised disclosure-improvement list feeding assignments.
  - New page `src/pages/RatingUplift.tsx`.
- **Depends on:** A1. Check licensing of rater methodologies (§5).

**B3. A+H dual-reporting mapping** (S–M)
- **What:**
  - Add rows to `api/_conceptSeed.ts` linking `cn-sse` ↔ `hkex-esg` (Part B and Part D) ↔ `issb` S2 ↔ `cn-csds`, so one value fills both reports through `api/_propagate.ts`.
  - "A+H mode" in onboarding enables both packs plus the cross-index.

**B4. Server-side calculation parity** (M)
- **What:**
  - Move all `src/calculators/registry.ts` and `scope3/*` logic into a shared package used by both client and server, e.g. `shared/calculators` imported by `api/calculators/compute.ts`.
  - Resolve factors from the `emission_factors` table instead of the hard-coded `EEIO_FACTORS` and `TRAVEL_EF`.
  - Persist `calculator_input` with the factor ID and version for audit replay.
- **Why:** assurors and the SSE guides' calculation methods require reproducible calculations.

**B5. Real assurance workspace** (M)
- **What:**
  - Replace the `moduleData` imports in `AssuranceReview.tsx`, `EntitySubmissions.tsx` and `MeasuredData.tsx` with API data.
  - Add a PBC (provided-by-client) request list, sampling (a random or stratified pick of `data_value`), findings with status, and a management-response loop.
  - Auditor role scoped to the period.
  - Export an assurance pack: evidence ZIP plus the hash-chain proof.
- **Plugs into:** `assurance_requests`, `audit_event`, `api/org.ts` assurance actions, `AuditorView.tsx`.

**B6. First live CN connectors** (M each)
- **What:**
  - Promote these from `cnCatalogue.ts` to `registry.ts` with real providers:
    1. Kingdee Cloud Galaxy WebAPI (fuel and energy purchases)
    2. Yonyou BIP open API
    3. DingTalk and Feishu HR (headcount, turnover, training hours for the employee topic)
    4. Aliyun IoT / Energy Expert API (metered energy)
  - Keep State Grid as a CSV/e-bill import template; State Grid has no public API [uncertain].
- **Depends on:** partner developer accounts.

**B7. Energy, water and pollutant calculators per SSE Guides No. 3–5** (M)
- **What:**
  - Comprehensive energy consumption (综合能耗) in tonnes of standard coal equivalent, using GB/T 2589-2020 conversion coefficients, with equivalent and equal-value electricity accounting.
  - Water withdrawal, consumption and recycling.
  - Pollutant loads (SO₂, NOx, COD, ammonia nitrogen, particulates).
  - Add to `src/calculators/registry.ts` and the B4 server engine, and link to the `cn-sse` items.

**B8. Scenario analysis lite and transition plan** (M)
- **What:**
  - A qualitative and semi-quantitative climate-risk register (physical and transition × time horizon × financial effect, qualitative allowed for FY2025–26).
  - Simple carbon-price sensitivity using national-ETS and CBAM price inputs.
  - A target pathway chart.
- **Plugs into:** `ClimateTargets.tsx` and `material_topics` IROs (`type` risk/opportunity already exists).

**B9. Board approval and e-seal** (M)
- **What:**
  - A `board_approval` step in `api/_workflow.ts` before `publish-report`.
  - An e签宝 or 法大大 adapter to seal the final PDF.
  - Store the signed hash in the audit chain.

### Phase C: Differentiators and later

| ID | Item | Size | Notes |
|---|---|---|---|
| C1 | Agentic AI report writer | L | Plan → draft per topic → consistency check against data → cite evidence → reviewer queue. Builds on A1, A2 and B3. Matches the MioTech, Workiva and Sweep agents. |
| C2 | MCP server and public data API | M | Expose org concepts, values and lineage read-only to customers' agents (MioTech launched this Sep 2026). Reuse `api/admin/api-keys.ts` scopes. Document in `docs/API.md`. |
| C3 | Peer benchmarking | L | Ingest published A-share and HKEX sustainability reports (CNINFO / HKEXnews PDFs) → extract KPIs with A1 → percentile vs industry peers. Check data licensing and terms. |
| C4 | CBAM and product carbon footprint | L | ISO 14067 / PCR-based product footprint; CBAM installation-level embedded emissions (direct and indirect, precursors) in the EU communication template; links to B1 for supplier precursors. For the exporter segment. |
| C5 | MEE environmental-information disclosure export | M | Annual report fields per the format standard; export file for upload to the provincial system (no public API [uncertain]). |
| C6 | National carbon market MRV | L | Sector templates (power, cement, steel, aluminium), monthly 存证 (evidence retention) data, verification support, export for the national management platform (全国碳市场管理平台). Treat the 2026 purchased-power rule change as config. Upsell for heavy industry. |
| C7 | Private deployment package (Docker/Helm, offline LLM option such as Qwen open weights) | L | Required by many SOEs and financial institutions. Easier once A5's Express/container refactor lands. |
| C8 | Battery passport; full climate-scenario modelling with physical hazard data; ESRS iXBRL certified validation via partner | L | Later. |

### Dependencies at a glance

| Item | Depends on |
|---|---|
| A1 | §5 GenAI registration (for launch) |
| A2 | A6; benefits from A1 |
| A4 | A3 |
| A5 | §5 hosting, ICP and entity |
| A7 | A5 (CN OAuth callbacks need a CN domain) |
| B2 | A1 |
| B1 | A5 (supplier SMS) |
| C1 | A1, A2, B3 |
| C3 | A1 |
| C4 | B1, B4 |
| C7 | A5 |

---

## 5. Business, legal and infrastructure workstream (not code)

| Item | What is needed | Blocking? | Notes |
|---|---|---|---|
| Legal entity / partner | A domestic operating entity (WFOE or JV), or a licensed local partner or reseller, to hold licences and contracts | Yes | Foreign ownership of VATS is capped at 50%. The Apr 2024 MIIT pilot (Beijing, Shanghai, Hainan, Shenzhen) may allow 100% for some services; confirm with counsel. [China Briefing](https://www.china-briefing.com/news/china-internet-business-licenses-foreign-companies/), [Mondaq](https://www.mondaq.com/china/inward-foreign-investment/1562874/china-to-eliminate-foreign-investment-restrictions-in-cloud-and-other-telecom-services) |
| ICP | ICP filing (备案) for the domain plus a **B25 ICP operating licence** for paid SaaS. Show the filing number in the footer (code hook in A5). | Yes | |
| Mainland hosting | Alibaba Cloud or Tencent Cloud account under the CN entity; RDS/PolarDB; OSS with WORM for evidence | Yes | Drives the A5 architecture choice. |
| MLPS (等保) 2.0 | Level 3 assessment by an accredited assessor, plus filing with the public security bureau | Yes, for SOE and listed buyers [memory] | Months of lead time. Pair with ISO 27001 (also on the global roadmap). |
| PIPL / DSL / Network Data Regulations (Order 790) | PI processing rules, privacy policy (zh), PI impact assessment, DPO contact, a cross-border transfer path | Yes | Keep CN personal data onshore. Emissions data of key industries could be "important data" [uncertain]; keep all CN tenant data onshore to avoid a CAC assessment. [CLT](https://www.chinalawtranslate.com/促进和规范数据跨境流动规定/) |
| Generative AI | Use only CAC-filed models (Qwen, DeepSeek, ERNIE). Register the Nexus AI features as an app calling a filed model (local CAC 登记). Display the model name and filing number. Comply with AI-content labelling (from 1 Sep 2025). Algorithm filing if applicable [memory]. | Yes, for AI features | Ship CN with AI off by default until registration is complete. [gmw](https://m.gmw.cn/2026-07/10/content_1304528476.htm) |
| Anthropic usage policy | Claude cannot serve Chinese-controlled entities, which includes many A+H and HK-listed issuers. | Yes | Route these orgs to non-Anthropic providers wherever they are hosted (A1). [medianama](https://www.medianama.com/2025/09/223-anthropic-service-policy-update-bans-ai-access-chinese-firms/) |
| Blockchain | CAC blockchain information-service filing (区块链信息服务备案) if marketing blockchain features. Avoid Bitcoin/OpenTimestamps for CN tenants (crypto sensitivity) [uncertain]. Prefer an RFC 3161 TSA or ChainMaker/BSN. | Yes, if the feature is exposed | |
| Electronic signature | Contract with e签宝, 法大大 or 契约锁 | No (B9) | |
| Billing | RMB pricing; fully digital e-invoices (数电票) via the CN entity; public-sector procurement forms | Yes, commercially | Price anchor: long tail under ¥100k/yr, mid ¥100–200k, enterprise ¥300k+. [sohu, low reliability](https://www.sohu.com/a/1069031507_120815119) |
| Trademark | Register "Nexus" and a Chinese brand name in classes 9, 35 and 42 | Yes, before marketing | "Nexus" is likely crowded [uncertain]. |
| Rater and data licensing | Permission to encode rater methodologies (B2) and to reuse published reports (C3) | For B2/C3 | Wind publishes its methodology; others [uncertain]. |
| Go-to-market partners | Assurance firms (CTI 华测, SGS, 中环联合, Big-4 China), IR/ESG consultancies, Alibaba Cloud marketplace | Commercial | Assurance partner credibility is a key buying factor. |
| Regulatory content QA | A native expert checks the CN-SSE, CSDS, HKEX and CASS item wording and the factor tables each year | Yes | Recurring cost. |

---

## 6. Open questions and caveats

- **Grid factors:** confirm the 2023 values (0.5306 / 0.6096 / 0.8273 and the regional ones) directly against the MEE/NBS Announcement 2025 No. 47 tables before seeding. No 2024 CO₂ factor had been published as of the research date.
- **Carbon-market reporting deadline:** the 31 Mar deadline varies by annual notice; verify it each year.
- **HKEX ESG filing format and deadline:** whether these changed under the 2025 rules is uncertain.
- **MLPS level:** buyer expectations (Level 2 vs Level 3) vary; confirm with target customers.
- **Competitor details:** these come mainly from vendor sites, press and review aggregators. The MioTech capabilities date from Sep 2026 and should be re-checked before positioning.
- **The `reporting dash copy` prototype:** contains UX for several Phase A items (region switcher, compliance settings, regulatory calendar, CN SSO screens). Porting that UX could cut A5, A7 and A8 front-end effort roughly in half.
