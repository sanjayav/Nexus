# Nexus China-market technical readiness audit

**Repo:** `/Users/kick/Desktop/Aeiforo/reporting dash` · **Branch:** `china-edition-v2` @ `1782283` · **Date:** 2026-10-16
**Mode:** Read-only. No project files were edited, no production calls were made and no database was accessed. Probe scripts ran only in the scratchpad (`audit-cn/probe/`) against the project's installed `node_modules`.

---

## 0. Bottom line

The UI is now well localised: about 5.4k keys, with en/zh parity. **A Chinese client still cannot produce a usable Chinese report.** The server-side outputs have not been touched:

1. **The PDF report garbles every Chinese character.** I confirmed this by rendering. The renderer uses only the built-in `Helvetica`, so Chinese comes out as Latin-1 mojibake (for example `ÿ•§¡Æâ…`), not even tofu. This covers the org name (the CN demo org is `绿源控股集团…`), narratives, line items and the Thai text that is hardcoded on the cover.
2. **The report's language is fixed in code.** The section headings, TOC, content index, assurance page, cover and footer are all hardcoded English, with some Thai mixed in. There is no `locale` input anywhere in the publish path, and `line_item_zh` is never selected.
3. **The four China frameworks are missing from the report's framework map.** As a result the cover shows `CN-SSE Sustainability Report` and the "framework name" `cn-sse`.
4. **Downloads with Chinese file names fail with HTTP 500.** Node rejects non-ASCII in `Content-Disposition` (confirmed). This affects evidence downloads of files such as `国网电费单.pdf` and DOCX downloads when the period label contains CJK.
5. **All server-generated text is English and unaware of language:** AI output, emails, notifications and anomaly headlines. Nothing on the server knows the user's language: there is no `users.locale` column and no `Accept-Language` header is sent.
6. **Data-residency routing is dead code.** `getDbForToken()` is never called. All 65 API files call `getDb()`, which always uses `DATABASE_URL`. Adding a `cn` region today would change nothing.

### Probes run (evidence, scratchpad only)

| Probe | Result |
|---|---|
| `@react-pdf/renderer@3.4.5`, `fontFamily: 'Helvetica'`, text `绿源控股集团 可持续发展报告 … รายงานความยั่งยืน` | The PDF's only font is `/BaseFont /Helvetica`. `pdftotext` and the rendered image show `ÿ•§¡Æâ#2"2'2!…`, so every CJK and Thai glyph is lost. |
| Registered a CJK TTF, long Chinese paragraph in a 250pt box, **no** hyphenation callback | Glyphs render, but the line **does not wrap** and runs off the page, because CJK has no spaces. |
| Same, with `Font.registerHyphenationCallback` splitting CJK into single characters | Wraps correctly. The PDF is 33 KB thanks to subsetting. A closing `》` can start a line (no kinsoku). |
| CJK font registered at one weight, then `fontWeight: 700` | OK (falls back to the nearest weight). |
| CJK font registered at one weight, then `fontStyle: 'italic'` | **Throws** `Could not resolve font for CJK, fontWeight 400`. `_reportPdf.tsx:588` uses italic on the signed-assurance path, so the italic variant must be registered too. |
| Node `res.setHeader('Content-Disposition', 'attachment; filename="report-CN-SSE-2025年度.docx"')` | `ERR_INVALID_CHAR: Invalid character in header content` → 500 |
| `Intl.NumberFormat('zh-CN',{notation:'compact'})` | `1.23万`, `1.23亿`: 万/亿 support is built in, so no custom code is needed. |
| `2026-03-31T18:00Z` in `Asia/Shanghai` vs `.toISOString().slice(0,10)` | `2026年4月1日` vs `2026-03-31`: the date is off by one day. |

---

## 1. Generated outputs

### 1.1 PDF: `api/_reportPdf.tsx`, `api/_reportGenerator.ts`

| Issue | Evidence |
|---|---|
| No `Font.register` anywhere. Only the built-in Helvetica and Courier are used, so CJK and Thai are garbled. | `_reportPdf.tsx:18` (imports have no `Font`), `:111`, `:118` (`fontFamily: 'Helvetica'`), `:159` (`Courier`) |
| No CJK line-break handling. Even with a font, Chinese paragraphs will not wrap (see probe). | No `registerHyphenationCallback` |
| Hardcoded Thai and Buddhist-era year on the cover of **every** report | `:260` `Sustainability Report · รายงานความยั่งยืน`, `:276` `Fiscal Year … · ปีบัญชี {year + 543}`, `:283` `About this report · เกี่ยวกับรายงาน`, `:326` `Scan to verify · สแกนเพื่อตรวจสอบ` |
| Org name variants are Thai-only (`thai_name`). There is no `name_zh` / `legal_name_zh`. | `_reportPdf.tsx:26`, `_reportGenerator.ts:29`, `setup.ts:1523` |
| The logo mark is built from `split(' ')` initials, so `绿源控股集团 (Lvyuan…)` becomes `绿(HG` | `_reportPdf.tsx:234` |
| Every heading, label and boilerplate string is English: `UNAUDITED DRAFT`, TOC, Sections 1–6, table headers, `FULL/PART/OMIT`, `ASSURANCE PENDING`, `Page x of y`, `Verify:` | `:244`, `:336-343`, `:369-406`, `:470-534`, `:548`, `:568-610`, `:629-641` |
| The TOC says `5. GRI Content Index` whatever the framework | `:342` |
| Assurance boilerplate and the default standard are ISAE 3000. Chinese assurance usually cites CSAE 3101 (中国注册会计师其他鉴证业务准则第3101号). | `:603`, `_reportGenerator.ts:181` |
| `formatValue` uses k/M abbreviations, not 万/亿 | `_reportPdf.tsx:219-223` |
| Dates are UTC `toISOString().slice(0,10)` | `:306`, `:406`, `:579` |
| Document metadata is English (`title`, `subject`, `keywords`) | `:652-659` |
| **The framework map lacks `cn-sse`, `cn-csds`, `hkex-esg` and `cass-esg`.** The fallback is `{code: id.toUpperCase(), name: id}`. | `_reportGenerator.ts:52-62` |
| **`line_item_zh` is never selected.** Metrics, narratives and the content index all use English `qa.line_item` / `qi.line_item`. | `_reportGenerator.ts:65-79`, `:96-110`, `:125-160` |
| Section and subsection come from `questionnaire_item.section/subsection`, which is English for the CN seeds (`SECTION = 'CN-SSE Sustainability Reporting Guidelines'`, plus English `subsection` values: 52 distinct across the 4 CN seeds). The fallback `'General disclosures'` is also English. | `_cnSseSeed.ts:37` and seeds, `_reportGenerator.ts:88`, `:100`, `:117` |
| The publish endpoint takes no locale. The PDF is rendered once, hashed and anchored, so language must be fixed at publish time and stored on the artifact. | `api/org.ts:1833-1883` (`publish-report`), with no `locale` in the body or in `report_artifacts` |

**Can a report be generated in Chinese at all today?** No. Even an all-Chinese CN-SSE dataset produces an English-and-Thai shell with garbled Chinese content.

### 1.2 DOCX: `api/_reportDocx.ts` (`docx@9.7.1`)
- There are no `styles.default.document.run.font.eastAsia` or `language.eastAsia` settings. Word usually falls back to a theme East Asian font, so Chinese is legible, but the font is inconsistent and proofing is wrong. `docx` 9.7.1 supports both: `IFontAttributesProperties.eastAsia` and `ILanguageOptions.eastAsia` (node_modules `docx/dist/index.d.ts:1211-1217`, `:1281-1285`).
- All headings and labels are English: `:62-69`, `:96-101`, `:155-209` (`Sustainability Report`, `Executive Summary`, `Narrative Disclosures`, `Quantitative Disclosures`, `Content Index`, `Assurance Statement`, `Audit Trail`). The executive summary has English pluralisation (`metric${…'s'}`) at `:166`.
- `m.value.toLocaleString()` runs in the server's default locale: `:80`.
- **The filename is built from `period.label`.** A CJK label makes `res.setHeader` throw, which returns a 500: `_reportDocx.ts:275` → `api/org.ts:649`.
- `_reportDocx.ts:244` hardcodes the base URL `https://app.aeiforo.com`.

### 1.3 iXBRL: `api/_ixbrl.ts`, `api/_ixbrlTaxonomy.ts`
- The `<html>` element has no `xml:lang`, so the language of `ix:nonNumeric` string facts is undeclared: `_ixbrl.ts:553-558`, `:586-587`.
- Labels come only from English taxonomy `label`s (`_ixbrl.ts:579`, `_ixbrlTaxonomy.ts:54+`). The taxonomy has **no concepts** for the CN, HKEX or CASS frameworks (frameworks covered: csrd-*, eu-taxonomy, gri, issb-s1/s2, sec-climate).
- The `UNIT_MEASURE` map has EUR, USD and GBP but no `iso4217:CNY` or `tce`. The fallback `utr:${u}` gives invalid measures: `_ixbrl.ts:192-220`.
- The draft banner, table headers and footer are English, and the banner points users to EFRAG validators: `:576`, `:589`, `:608-613`, `:632`.
- Relevance: China has no sustainability iXBRL mandate today, so this is P2.

### 1.4 Excel and CSV
- **CSV exports have no UTF-8 BOM.** Excel on Chinese Windows opens them as GBK, so Chinese becomes mojibake.
  - `src/pages/DataEntrySpreadsheet.tsx:572`: `new Blob([lines.join('\n')], { type: 'text/csv' })`
  - `api/audit.ts:119-123`: `text/csv; charset=utf-8`, body without `﻿`. The client saves it as-is (`src/pages/AuditLog.tsx:122-129`).
  - Headers are English snake_case keys (`DataEntrySpreadsheet.tsx:562`, `audit.ts:106`).
- **CSV imports assume UTF-8.** Chinese Excel's "CSV (逗号分隔)" option saves as GB18030/GBK, so imports come in garbled.
  - `src/pages/Connectors.tsx:164`: `Papa.parse(file, …)` with no `encoding` set and no detection.
  - `src/components/ExcelImport.tsx:254` accepts `.csv`, but `:84-139` always calls `workbook.xlsx.load()`. That is broken for any CSV, Chinese or not.
- Excel template headers are English (`src/pages/SustainabilityPerformanceReport.tsx:487`, sheet `'Performance Data'` at `:511`). The import aliases are English-only (`:432-437`), so a sheet with headers like `数值` or `单位` will not map. `RawSupplierIngestion.tsx:87` (`autoMapColumn`) and `ExcelImport.tsx:41` (`autoMapColumns`) have the same English-only heuristics.
- Writing CJK into `.xlsx` with exceljs is fine (Unicode).

### 1.5 Public report and verify pages
- `src/pages/PublicReport.tsx` and `src/pages/VerifyReport.tsx` are localised: `t()`, `itemLabel()` and `zh-CN` dates (`PublicReport.tsx:56-59`, `:207`, `:228-230`). They follow the **viewer's** browser language, not the report's language.
- Gaps: the framework is shown as `framework_id.toUpperCase()` (`PublicReport.tsx:~193`), not `nameZh`. The org name has no Chinese variant.

### 1.6 Email and notifications: `api/_email.ts`, `api/_notify.ts`, callers
- The template is English and has no language parameter: `_notify.ts:42-50` (`Open Nexus`, footer).
- Subjects and bodies are composed in English by the callers and **stored** as text in `notifications.subject/body`. The bell renders them raw (`src/components/NotificationsBell.tsx:196-197`).
  - `api/org.ts:1146` `New assignment · ${gri_code}`, `:1308`, `:1693`, `:1714`, `:1739`
  - `api/workflow/index.ts:307`, `:348`, `:351`, `:392` (`'Review requested'`, `'Approval needed'`, `'Sent back'`…)
  - `api/auth/forgot-password.ts:90-96`: password-reset email in English
- `notify()` returns early when there is no email (`_notify.ts:36`). Users without an email address (typical for WeCom or DingTalk identities) would get **no** in-app notification row either.
- The IM bots are Chinese-ready (`_notifyChannels.ts`: `LINK_LABEL = '在 Nexus 中查看'`), but they forward the English subject and body.
- Transport: Resend (`_email.ts:20`) delivers poorly to QQ, 163 and 126 mailboxes. Consider Aliyun DirectMail or Tencent Cloud SES for the CN stack.

---

## 2. AI features: `api/_claude.ts`, `api/ai/*`

**Language**
- No prompt takes or honours a language. They are English-only by design:
  - `_claude.ts:28-37` `SYSTEM_PROMPT` (draft): English style rules and `"[Data not provided]"`
  - `_claude.ts:240`, `:284-291` anomaly narration: "Plain English"
  - `_claude.ts:355+` gap analysis, `:90+` EF matcher, `api/ai/extract-evidence.ts:42` extraction
- No language reaches the server. `src/lib/api.ts:83-87` sends only `Authorization`, with no `Accept-Language` or `X-Lang` header.
- **Caches ignore language.** If an English answer is cached, a zh user is served it:
  - `api/ai/analyze-gaps.ts:26`, `:95-105`: keyed on (org, framework, year, question)
  - `api/ai/narrate-anomaly.ts:13`, `:34-37`: a single `anomalies.ai_narrative` column
- **CN frameworks cannot be drafted.** `api/ai/draft.ts:9` has `z.enum(['gri','csrd','tcfd','cdp','issb'])`, `_claude.ts:12` has the `DraftRequest.framework` union, and `src/pages/AIReport.tsx:67-73` `FRAMEWORK_OPTIONS` lists only 5 global frameworks. `analyze-gaps.ts:208` passes `name: frameworkId` (no catalog name).

**Vendor and regulation**
- Calls are hardwired to Anthropic. There is a singleton in `_claude.ts:1-9` and a second, separately constructed client in `api/ai/extract-evidence.ts:218`. The model id is hardcoded in 6 places: `_claude.ts:166`, `:215`, `:446`, `:493`, `analyze-gaps.ts:25`, `extract-evidence.ts:31`. Anthropic-specific features are used throughout: `cache_control` prompt caching, forced `tool_choice`, and native PDF `document` blocks (`extract-evidence.ts:~187-193`).
- **Mainland constraint:** Anthropic's API is not offered in mainland China. Public-facing generative-AI services there fall under the 2023 Interim Measures for GenAI Services (生成式人工智能服务管理暂行办法), which require filing or registration (备案/登记) and usually a model that has already been filed. Sending evidence documents such as invoices and bills to a US endpoint is also a PIPL cross-border transfer. This needs confirmation from legal.
- **Where a provider abstraction plugs in:** add `api/_llm.ts` with an interface such as `complete({system, messages, tools?, toolChoice?, documents?, language})` that returns `{text|toolInput, usage, model}`. Implement:
  - `anthropic`: the current code
  - `openai-compatible`: Alibaba Bailian/DashScope (Qwen), DeepSeek and Zhipu GLM all expose OpenAI-style chat and tool-calling
  
  Select the provider from env or per deployment (`LLM_PROVIDER`, `LLM_MODEL`, `LLM_BASE_URL`). Route all 5 call sites through it. PDF and image extraction needs a separate path for domestic models, either a VL model or OCR followed by text. Prompt caching becomes a no-op there. Add an `AI_ENABLED` kill switch so the CN stack can ship before filing.

---

## 3. Data model, region, units and time

**English-only database and server text**

| Item | Evidence |
|---|---|
| Questionnaire `section` and `subsection` are English. Only `line_item_zh` was added. | `api/setup.ts:348`. CN seeds: 52 English subsections. GRI/ESRS/ISSB seeds have no `line_item_zh` at all. |
| The UI subsection label keys cover only the 34 demo SPD subsections | `src/reports/spdTemplate.ts:84-86`, `src/i18n/locales/zh/perfReport.json` (`subsections`: 34 keys) |
| Glossary: 52 English entries, used by `JargonTooltip` | `src/data/glossary.ts`, `src/components/JargonTooltip.tsx:4` |
| RBAC system roles are handled with `t('shell.roles.*', {defaultValue})`. This is fine. | `src/pages/UsersRoles.tsx:97-98`, `PipelineJourney.tsx:175`, `WelcomeWizard.tsx:585` |
| Audit actions show as raw codes. Details JSON is English. | `src/pages/AuditLog.tsx:316` |
| Anomaly `headline` and `detail` are built server-side in English and rendered raw | `api/_anomalies.ts:150-309`, `src/components/AnomalyFeed.tsx:192-193`. The structured fields already exist (`anomaly_type`, `delta_pct`, `z_score`, `prior_year`) at `_anomalies.ts:40-58`. |
| Server error strings are English and shown via `e.message` | e.g. `api/org.ts:1856`, `api/workflow/index.ts:434` |
| `@mention` regex `/@([\w.+-]+)/` does not match CJK names | `src/components/CommentThread.tsx:353`, `:439` |

**Region and data residency**
- The constraint is `CHECK (region IN ('us','eu','apac'))` (`api/setup.ts:62`). Because the column already exists, adding `cn` means dropping and recreating the auto-named check (probably `organisations_region_check`) rather than editing that line.
- The region type is duplicated in 5 places: `_db.ts:3`, `auth/register.ts:14`, `:76`, `:209`, `auth/login.ts:68`, `auth/mfa/verify.ts:119`.
- **Routing is not wired up.** `getDbForToken` (`_auth.ts:165-167`) has **zero** callers. 65 API files call `getDb()` (68 call sites), and the default `'us'` maps to `DATABASE_URL`. Login, SSO and register also do a global email lookup on `getDb()` (`auth/login.ts:34`).
- **The driver will not reach a mainland Postgres.** `_db.ts:35` uses `neon(url)` from `@neondatabase/serverless`, which speaks Neon's HTTP/WebSocket proxy protocol, not plain Postgres. Neon has no mainland region. A `DATABASE_URL_CN` pointing at ApsaraDB RDS, PolarDB or TencentDB therefore needs one of:
  - a driver switch: `postgres` (postgres.js) has the same tagged-template call shape, so `sql\`...\`` call sites would mostly keep working; or
  - a self-hosted Neon-compatible HTTP proxy.
- **Recommendation:** run China as a **separate deployment stack** (CN app + CN DB + CN secrets) rather than a `cn` row routed from the global stack. PIPL treats even a global user directory or login lookup as cross-border personal data. If routing is kept, `_db.ts` should add a `cn` branch that **fails closed**: throw if `DATABASE_URL_CN` is unset. The EU and APAC branches silently fall back to the US database (`_db.ts:20-31`), which is the wrong behaviour for residency.
- `docs/REGIONS.md` is referenced at `setup.ts:61`. Verify it exists if residency is sold.

**Currency and units**
- Spend inputs are hardcoded to USD in 8 Scope 3 calculators and every PCAF calculator, e.g. `src/calculators/scope3/cat01_purchasedGoods.ts:52`, `cat02:47`, `cat04:63`, `cat06:72`, `cat09:49`, `cat10:43`, `cat15:30-48`, `src/calculators/pcaf/*.ts`. There is no FX conversion and no CNY spend factors, so a CNY spend gives a wrong Scope 3 result. `pcaf_holdings.reporting_currency DEFAULT 'USD'` is at `setup.ts:1490`.
- `$…k` formatting is hardcoded: `src/components/pcaf/PortfolioGrid.tsx:35-37`, `src/pages/PcafPortfolio.tsx:336-338`.
- `tce` and `tce/CNY million` exist only as unit strings (`_cnSseSeed.ts:114`, `:117`). There are no 折标准煤 conversion coefficients (GB/T 2589). Units display raw and in English, with no `吨标准煤` / `千瓦时` / `万元` mapping.
- Grid factor ambiguity: both IEA (0.556) and MEE (0.5703) CN rows exist, and sorting by `valid_from` picks IEA (`docs/CHINA_EDITION.md`, open decision 3).

**Timezone and dates**
- There is no timezone anywhere: no `organisations.timezone`, no `Asia/Shanghai`, no `timeZone:` option.
- There are 18 `toISOString().slice(0, 10)` sites in `src` and `api`, and the anomaly lateness maths is in UTC (`api/_anomalies.ts:170-176`). For UTC+8 users, anything done after 16:00 Beijing time lands on the previous day, and due dates and "submitted N days late" are off by one around midnight. This is confirmed with Intl (see the probes).

---

## 4. Authentication and identity

Current setup: email and password with a JWT signed by `jose` (`api/_auth.ts:55-167`, `api/auth/login.ts`). Enterprise SSO goes through WorkOS (`api/_workos.ts`, `api/auth/sso/{discover,initiate,callback}.ts`). MFA is TOTP-only via `otpauth`, issuer `'Nexus'` (`api/auth/mfa/enroll.ts:53-61`). SCIM v2 is at `api/scim/v2/Users`.

| Need | Where it plugs in | What's needed |
|---|---|---|
| **WeCom / DingTalk / Feishu login** (企业微信 / 钉钉 / 飞书 OAuth, scan-to-login) | New `api/auth/oauth/[provider]/{initiate,callback}.ts`, mirroring `api/auth/sso/callback.ts` (state JWT at `:8-18`, then find-or-create user, then `signToken`). A dynamic-provider route pattern already exists at `api/connectors/oauth/callback/[provider].ts`. Login UI: `src/pages/Login.tsx:92-125` is currently email-discovery-centric. | Per-org app credentials (corp_id, agent_id, app_key/secret) in an encrypted table (`api/_crypto.ts` exists). A new `user_external_identities(provider, tenant_key, external_user_id, user_id)` table. These IdPs are not standard OIDC/SAML for WorkOS, so build direct integrations. |
| **Users without email** | `users.email TEXT UNIQUE NOT NULL` (`setup.ts:92`). Login and SSO look up by email (`login.ts:50`, `sso/callback.ts:56-63`). `notify()` requires an email (`_notify.ts:36`). | Make email nullable, or add `phone_e164 UNIQUE` plus external identities. Notification delivery should fall back to in-app and IM. |
| **+86 SMS OTP** (login or second factor) | New `api/auth/otp/{send,verify}.ts`, and a new MFA method alongside `api/auth/mfa/*` | Aliyun SMS or Tencent Cloud SMS, both of which need an approved 签名 and 模板. Hashed OTP table with TTL. Throttle per phone and IP with the existing DB-backed `api/_rateLimit.ts`. |
| **Directory sync** (replacing SCIM) | `api/scim/v2/*` stays for global IdPs | WeCom, DingTalk and Feishu push contacts and departments via their own APIs and event callbacks. Add a connector job that maps departments to `org_entities` and users to roles. The catalogue entries exist but are "coming soon" (`api/_connectors/providers/cnCatalogue.ts`). |
| Chinese name order | `sso/callback.ts:59` `${firstName} ${lastName}` | Use the IdP's display name. Chinese names are surname-first with no space. |
| WorkOS from the mainland | `_workos.ts` | Browser redirects to WorkOS-hosted pages and global IdPs are slow or unreliable. Azure AD China (21Vianet) support needs checking. |

---

## 5. Network and performance from the mainland

| Origin or asset | Where | Impact | Fix |
|---|---|---|---|
| `fonts.googleapis.com`, `fonts.gstatic.com`, `rsms.me` | `index.html:7-24` | Already non-blocking (`media=print` swap) with PingFang/YaHei fallbacks, which is good. Preconnects to blocked hosts and stalled background requests remain, along with a late font swap. | Self-host Latin fonts (`@fontsource/*`) and drop the preconnects (P2, S) |
| **Spline 3D**: runtime chunk `spline-*.js` 4.6 MB raw / **1.47 MB gzip**, plus scene `https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode` | `src/pages/Login.tsx:626-628`, `src/components/SplineScene.tsx:4` | Lazy-loaded but **mounted even when CSS-hidden** (`hidden lg:flex`), so every login visit downloads it, mobile included. The scene host is foreign and slow in CN. This is the first screen a client sees. | Gate on `matchMedia('(min-width:1024px)')` and region/locale, and show a static poster in CN (P1, S) |
| Liveblocks (`wss://…liveblocks.io`) | `src/lib/liveblocks.ts:59-75`, `api/_liveblocks.ts` | High latency and possible WebSocket resets. The editor degrades to solo mode, which is good. | For the CN stack, either disable collaboration or self-host Yjs (Hocuspocus / y-websocket) (P2, L) |
| Sentry with **session replay** | `src/lib/sentry.ts:23-50` (`replaysOnErrorSampleRate: 1.0`) | Ships DOM recordings, which contain PII, to sentry.io: a PIPL cross-border transfer. sentry.io is also slow from CN. | Leave the DSN unset in the CN stack, or self-host Sentry (P1, S) |
| OpenTimestamps `a.pool.opentimestamps.org` (server) | `api/_reportGenerator.ts:233`, `api/blockchain/index.ts:142` | Foreign call from a CN server. It anchors to Bitcoin, which is sensitive and subject to the CAC blockchain-service filing. | CN stack: RFC 3161 timestamp from a Chinese TSA/CA (e.g. 联合信任), behind the same `anchor*` interface (P2, M) |
| Resend, Anthropic, WorkOS (server) | `_email.ts:20`, `_claude.ts`, `_workos.ts` | Foreign SaaS; see §2 and §4 | Provider abstractions |
| Hosting: Vercel, no `regions` in `vercel.json` (defaults to US East); 71 files import `@vercel/node` | `vercel.json` | Vercel cannot be hosted in the mainland. An ICP-filed mainland deployment needs a container or Function Compute adapter for the handlers. HK or SG hosting avoids ICP but adds latency, and PIPL export rules still apply. | Infra decision (XL) |

**Bundle**
- The entry chunk `dist/assets/index-*.js` is about 1.0 MB raw / 327 KB gzip. Locale dictionaries are **eagerly** globbed into it (`src/i18n/index.ts:15`, `{ eager: true }`): about 412 KB of en JSON plus 416 KB of zh JSON. Every user downloads both languages.
- Other large chunks: `exceljs.min` 939 KB, `DataEntrySpreadsheet` 663 KB, `recharts` 434 KB. Spline is separate, as above.
- `dist/` was built 07:01, before the 11:48 zh commit, so rebuild before measuring precisely.
- Fix: load locales lazily per language (`i18next-resources-to-backend` + `import(\`./locales/${lng}/${ns}.json\`)`) (P2, S).

---

## 6. Number and date formatting still hardcoded

- Explicit `en-US` / `en-GB`:
  - `src/data/demoData.ts:1184` (`formatNumber` → `toLocaleString('en-US')`)
  - `src/reports/spdTemplate.ts:190`, `:192` (`formatValue`)
  - `src/pages/BlockchainAudit.tsx:106`, `:126`, `:287` (en-GB fallback; zh handled)
  - `src/pages/UsersRoles.tsx:90` (handled)
- Hand-rolled k/M/B abbreviations, wrong for zh (should be 万/亿), at 14 sites:
  - `src/components/AnimatedNumber.tsx:35-36`
  - `src/components/HistoricalReferencePanel.tsx:364-365`
  - `src/components/pcaf/PortfolioGrid.tsx:35-37`
  - `src/data/demoData.ts:1175-1178`
  - `src/design-system/components/MetricCard.tsx:132-133`
  - `src/pages/GroupRollup.tsx:331-332`
  - `src/pages/ScopeCalculator.tsx:452`, `:521`
  - `src/pages/WorkflowQueue.tsx:558-559`
  - `src/pages/PcafPortfolio.tsx:336-338`
  - `src/pages/DataEntry.tsx:880-881`
  - `src/reports/spdTemplate.ts:188-189`
  - server side: `api/_reportPdf.tsx:220-221`, `api/_anomalies.ts:114-115`
- `toLocaleString()` / `toLocaleDateString()` with **no locale** (follows the browser, not the app language): 21 sites, e.g. `AnimatedNumber.tsx:11`, `MetricCard.tsx:134`, `RawSupplierIngestion.tsx:383-1000`, `OrgStructure.tsx:313/403/625`, `SustainabilityPerformanceReport.tsx:255-257`, `ExcelImport.tsx:420`, `BlockchainProof.tsx:106`.
- zh detection is ad hoc (`startsWith('zh')`) in 38 files, and there is no shared locale helper. `localeCompare` has no `'zh-CN'` collator at 4 sites, so there is no pinyin ordering.

---

## 7. Prioritised fix list

Size: **S** ≤ 1 day · **M** 2–4 days · **L** 1–2 weeks · **XL** more than 2 weeks / infra.

### P0: blocks a Chinese client from producing or delivering a report

| # | Fix | Files | Approach | Size |
|---|---|---|---|---|
| P0-1 | **Embed a CJK font in the PDF** | `api/_reportPdf.tsx` (styles `:105-215`), new `api/_fonts/` and `vercel.json` (`functions["api/org.ts"].includeFiles`) | `Font.register({family:'NotoSansSC', fonts:[{src:Regular.ttf},{src:Bold.ttf,fontWeight:700},{src:Regular.ttf,fontStyle:'italic'}]})`. Use static TTF/OTF, not WOFF2 or variable fonts. Noto Sans SC / Source Han Sans SC are OFL-licensed. Also register a Thai font, or remove the Thai (P0-2). Register a hyphenation callback that splits CJK runs into single characters, ideally keeping closing punctuation `，。》）` attached to the previous character. Set `fontFamily` in `page`/`coverPage` and swap `Courier` for a mono font that has CJK fallback. Load from `path.join(process.cwd(),'api/_fonts/…')` so Vercel's tracer bundles it. Expect +10–20 MB in the function and a slightly slower cold start. Output stays small because fonts are subset. | M |
| P0-2 | **Language-aware report rendering (PDF and DOCX)** | `api/org.ts:1833-1883` (`publish-report` body), `report_artifacts` (+`locale` column in `setup.ts`), `api/_reportGenerator.ts`, `api/_reportPdf.tsx`, `api/_reportDocx.ts`, `src/pages/ReportPublishing.tsx` (+ selector), new `api/_i18n/report.{en,zh}.json` | Add `locale: 'en' \| 'zh-CN' \| 'bilingual'` to `ReportInput`. Move every hardcoded string (cover, TOC, sections, table headers, status pills, assurance text, footer, metadata) into the dictionary. **Remove the hardcoded Thai and Buddhist-era year**, or make it a `th` locale. Select `COALESCE(qi.line_item_zh, qa.line_item)` when zh. Use `Intl.NumberFormat(locale,{notation:'compact'})` and dates in the org TZ. Use `name_zh`/`legal_name_zh` when present (new columns). Fix the logo-mark derivation for CJK. Offer CSAE 3101 wording when the org country is CN. DOCX: set `styles.default.document.run.font = {ascii:'Calibri', eastAsia:'Microsoft YaHei'}` and `language: {value:'en-US', eastAsia:'zh-CN'}`, and localise headings. Store the locale on the artifact, because the PDF hash is anchored. | L |
| P0-3 | **Add the CN frameworks to the report framework map** | `api/_reportGenerator.ts:52-62`, `api/ai/analyze-gaps.ts:208` | Replace the hardcoded map with a shared server-safe catalog (code, name, nameZh) drawn from `src/lib/frameworks.ts`, or a `frameworks` table. Include cn-sse, cn-csds, hkex-esg and cass-esg. Make the TOC and content-index title framework-aware (`_reportPdf.tsx:342`, `:521`). | S |
| P0-4 | **Fix the `Content-Disposition` 500 on CJK filenames** | `api/org.ts:632`, `:649`; `api/_reportDocx.ts:275`; `api/workflow/index.ts:148` (evidence download); `api/reports/[id]/ixbrl.ts:95`, `:143`; `api/admin/export.ts:32` | Add a shared helper: `attachment; filename="<ascii-fallback>"; filename*=UTF-8''<encodeURIComponent(name)>`. Today any evidence file named in Chinese cannot be downloaded by reviewers or auditors. | S |
| P0-5 | **Chinese section and subsection headings** for the report body and tree | `api/setup.ts` (+`section_zh`, `subsection_zh`), `api/_cnSseSeed.ts`, `_cnCsdsSeed.ts`, `_hkexEsgSeed.ts`, `_cassEsgSeed.ts` (52 subsections plus the 4 `SECTION` constants), `_reportGenerator.ts` queries, `src/lib/itemLabel.ts` (+`sectionLabel`) | Add nullable columns with NULL-safe upserts, matching the existing `line_item_zh` pattern. Read them via `to_jsonb(row)->>'…'` for schema-drift safety. Report and tree use zh when the locale is zh. | M |

### P1: needed for a credible Chinese deployment

| # | Fix | Files | Approach | Size |
|---|---|---|---|---|
| P1-1 | **Send the user's language to the server and persist it** | `src/lib/api.ts:83-87`, `api/setup.ts` (+`users.locale`), `api/auth/me.ts` | Send an `Accept-Language` header from `i18n.language` and store the preference on the user. This is the prerequisite for P1-2 to P1-4. | S |
| P1-2 | **AI answers in the user's language** | `api/_claude.ts` (all 4 prompts and request types), `api/ai/draft.ts:9`, `api/ai/analyze-gaps.ts:95-105` (cache key), `api/ai/narrate-anomaly.ts` (`ai_narrative` → per-locale), `api/ai/extract-evidence.ts:42`, `src/pages/AIReport.tsx:67-73` | Add `language` to every request and append "Respond in Simplified Chinese (简体中文)…; use regulator terminology for {framework}" when zh. Put the language in cache keys. Allow CN framework ids in the draft enum, with CN-specific style guidance (CN-SSE, CSDS, HKEX). Teach extraction to normalise Chinese bills and fapiao units (千瓦时→kWh, 立方米→m³, 吨→t). | M |
| P1-3 | **LLM provider abstraction plus a CN kill switch** | New `api/_llm.ts`; refactor `_claude.ts` and `ai/extract-evidence.ts:218`; model ids at the 6 sites in §2 | Provider interface with `anthropic` and `openai-compatible` (Qwen/DashScope, DeepSeek, GLM) implementations. `AI_ENABLED=false` by default in the CN stack until GenAI filing is resolved. The UI hides AI entry points when disabled. | L |
| P1-4 | **Localised notifications, emails and anomalies** | `api/_notify.ts:36-50`, callers (`api/org.ts:1146`, `:1308`, `:1693-1739`; `api/workflow/index.ts:307-392`; `api/auth/forgot-password.ts:90-96`), `notifications` table (+`params JSONB`), `src/components/NotificationsBell.tsx:196`, `api/_anomalies.ts:150-309`, `src/components/AnomalyFeed.tsx:192-193` | Store `kind` + `params`, and render client-side with `t('notifications.<kind>', params)`. Render emails server-side from a dictionary using the recipient's `users.locale`. Anomalies should return a `code` + params, with the client templating `headline`/`detail`. Allow notifications without an email address. | M |
| P1-5 | **Shared locale-formatting module** | New `src/lib/locale.ts` (`useLocale()` → `intlLocale`, `fmtNumber`, `fmtCompact`, `fmtDate`, `fmtCurrency`, collator); replace the 14 k/M sites, 21 bare `toLocale*` sites, `demoData.ts:1184` and `spdTemplate.ts:186-195` from §6; consolidate the 38 ad hoc `startsWith('zh')` checks | `Intl.NumberFormat('zh-CN',{notation:'compact'})` gives 万/亿 for free. Add a server twin for the PDF and anomalies. | M |
| P1-6 | **Organisation timezone** | `api/setup.ts` (+`organisations.timezone`, default from country, e.g. CN → `Asia/Shanghai`); the 18 `toISOString().slice(0,10)` sites; `api/_anomalies.ts:170-176`; report dates | Compute due-date and period boundaries and "days late" in the org timezone, and format with `timeZone`. | M |
| P1-7 | **CSV encoding** | Exports: `src/pages/DataEntrySpreadsheet.tsx:572`, `api/audit.ts:119-123` (prepend `﻿`). Imports: `src/pages/Connectors.tsx:164`, `src/components/ExcelImport.tsx:84-139` (CSV path is broken) | On exports, prepend the BOM. On import, read an ArrayBuffer and try UTF-8 with `fatal:true`; on failure use `TextDecoder('gb18030')`, then hand the text to Papa. Add Chinese header aliases (`数值`, `单位`, `指标`, `编码`) to `SustainabilityPerformanceReport.tsx:432-437`, `ExcelImport.tsx:41` and `RawSupplierIngestion.tsx:87`. | S |
| P1-8 | **Units and currency** | `src/calculators/scope3/*` and `src/calculators/pcaf/*` (USD hardcoded), `api/_ixbrl.ts:192-205`, unit display | Org reporting currency plus an FX table (or CNY-native EEIO factors) for spend-based Scope 3. Unit display dictionary (tce→吨标准煤, kWh→千瓦时, t→吨, CNY million→百万元 / 万元). GB/T 2589 折标煤 coefficients for energy → tce. Decide the default CN grid factor (MEE vs IEA). | L |
| P1-9 | **Region `cn` / data residency** (P0 if the contract requires mainland residency) | `api/_db.ts:3-37`, `api/setup.ts:62`, `api/_auth.ts:165`, `api/auth/{login,register}.ts`, `api/auth/mfa/verify.ts:119`, and all 65 `getDb()` files | Preferred: a **separate CN deployment stack** with its own DB, secrets and providers, and no global lookup. If routing is kept: add `'cn'` to `Region`, migrate the check constraint, and fail closed when `DATABASE_URL_CN` is missing. Replace `getDb()` with `getDbForToken(token)` everywhere (it has no callers today). Swap `neon()` for a driver that speaks plain Postgres (postgres.js) to reach ApsaraDB, PolarDB or TencentDB. | XL |
| P1-10 | **Login page weight from the mainland** | `src/pages/Login.tsx:618-629`, `src/components/SplineScene.tsx` | Do not mount Spline below `lg` or when the locale is zh / the stack is CN. Use a static poster instead. This saves 1.47 MB gzip plus a foreign scene fetch. | S |
| P1-11 | **Sentry PII cross-border** | `src/lib/sentry.ts:23-50` | Disable replay, or leave the DSN unset, in the CN stack, or self-host. | S |
| P1-12 | **CN identity: WeCom / DingTalk / Feishu OAuth, +86 SMS OTP, users without email** | See the §4 table: `api/auth/oauth/[provider]/*` (new), `api/auth/otp/*` (new), `setup.ts:92` (`users.email`), `user_external_identities` (new), `api/auth/mfa/*`, `src/pages/Login.tsx` | Direct OAuth integrations with per-org credentials stored encrypted via `_crypto.ts`. SMS via Aliyun or Tencent with approved templates and rate limiting via `_rateLimit.ts`. Directory sync connector. | L |
| P1-13 | **Chinese glossary** | `src/data/glossary.ts` (52 entries), `src/components/JargonTooltip.tsx` | Move the glossary into `locales/{en,zh}/glossary.json`. Add CN terms (双重重要性, 综合能源消费, 碳排放权交易, CCER, 折标煤). | S–M |

### P2: polish and longer-term

| # | Fix | Files | Size |
|---|---|---|---|
| P2-1 | iXBRL: add `xml:lang` on `<html>`, a zh label set, `iso4217:CNY` and `tce` measures, and localised banner and table headers. CN taxonomy concepts only if a mandate appears. | `api/_ixbrl.ts:192-220`, `:553-632`, `api/_ixbrlTaxonomy.ts` | M |
| P2-2 | Lazy-load locale dictionaries per language | `src/i18n/index.ts:15-24` | S |
| P2-3 | Self-host Latin web fonts and remove the Google/rsms preconnects | `index.html:7-24` | S |
| P2-4 | Collaboration in the CN stack: self-hosted Yjs instead of Liveblocks | `src/lib/liveblocks.ts`, `api/_liveblocks.ts` | L |
| P2-5 | Timestamping in the CN stack: an RFC 3161 TSA instead of OpenTimestamps/Bitcoin | `api/_reportGenerator.ts:230-254`, `api/blockchain/index.ts:142` | M |
| P2-6 | Email provider abstraction (Aliyun DirectMail / Tencent SES) | `api/_email.ts` | S |
| P2-7 | Unicode-aware `@mention` regex (`/@([\p{L}\p{N}._+-]+)/gu`) | `src/components/CommentThread.tsx:353`, `:439` | S |
| P2-8 | Audit-log action labels via `t('audit.actions.*')` | `src/pages/AuditLog.tsx:316` | S |
| P2-9 | API error codes instead of English messages | e.g. `api/org.ts:1856`, `api/workflow/index.ts:434` | M |
| P2-10 | Chinese-name handling in SSO, plus pinyin collation (`Intl.Collator('zh-CN')`) | `api/auth/sso/callback.ts:59`; 4 `localeCompare` sites | S |
| P2-11 | Localised `<title>` and meta (currently English, with `£500/mo` pricing) | `index.html:25-37` | S |
| P2-12 | Mainland hosting adapter: Vercel handler → container or Function Compute (71 `@vercel/node` files), ICP filing | infra | XL |
| P2-13 | `line_item_zh` for GRI, ISSB and ESRS (Chinese clients also report under GRI and ISSB, e.g. HK dual listings) | `api/_*Seed.ts` | L (translation) |

### Suggested order
1. **Sprint 1 (report-ready):** P0-1, P0-3, P0-4, then P0-2 and P0-5. Smoke test: run `npm run seed-cn`, publish CN-SSE in zh, and open the PDF and DOCX on a Chinese Windows machine.
2. **Sprint 2:** P1-1, P1-2, P1-4, P1-5, P1-6, P1-7 and P1-10/11.
3. **In parallel, legal and infra decisions** that gate P1-3, P1-9, P1-12 and P2-12: GenAI filing, PIPL export assessment, ICP, hosting region.

---

### Aside (out of scope, noticed in passing)
`api/workflow/index.ts:140-143`: the `evidence-file` view selects `FROM evidence WHERE id = ${evidence_id}` with no `org_id` filter, and I saw no ownership check nearby. Please verify that this is not a cross-tenant read.
