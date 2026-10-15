# Nexus — China Edition: Status & Gap Plan

**Date:** 2026-10-16
**Goal:** sell and operate Nexus for mainland-China listed companies (A-share, A+H), in Simplified Chinese, on infrastructure and integrations those clients can actually use.

---

## 1. Model: language ≠ market

| Concept | What it controls | Where |
|---|---|---|
| **UI language** (EN / 简体中文) | Labels, formatting (dates, 万/亿 numbers) | per user · `src/i18n` |
| **Workspace region** (Global / 中国大陆) | Frameworks, emission factors, currency, trust chain, SSO, notification channels, hosting, privacy regime | per tenant · `src/workspace/regions.ts` |

A Chinese CSO can use the global tenant; an English-speaking auditor can review a mainland tenant. Tenant data (task names, answers, sites) stays in the tenant's own language; framework text and UI translate.

## 2. Built in this revamp

**Platform**
- Workspace/region layer (`WorkspaceProvider`, `useMockData`, `useMoney`, `useL10n`). The org switcher now really switches tenants.
- Demo tenant **绿源控股集团 (Lvyuan Holdings Group)**: fictional A+H-listed new-energy manufacturer with native Chinese data for FY2026.
- First-visit default: Chinese-language browsers land in the mainland tenant.

**China framework pack**
- 沪深北交易所《上市公司自律监管指引——可持续发展报告（试行）》(CN-SSE), including double materiality
- 财政部《企业可持续披露准则——基本准则》+ 气候准则（试行）(CN-CSDS)
- 港交所《环境、社会及管治守则》including climate disclosures (HKEX-ESG)
- CASS-ESG 5.0 (relabelled; it was previously misattributed)
- GHG accounting defaults: 生态环境部 national grid factor 0.5703 tCO₂e/MWh, GB/T 32150
- Regulatory calendar on the Command Center (the next deadline is the FY2026 report, due with the annual report by 2027-04-30)

**China integrations (UI + config; demo data)**
- Connectors: 金蝶, 用友, SAP China, State Grid metering, 阿里云 IoT, 钉钉/飞书/企业微信 HR, national carbon market reporting export
- Identity: 企业微信 / 钉钉 / 飞书 SSO and +86 SMS login (shown as "configured by admin" and not faked)
- Trust: 长安链 ChainMaker via BSN (permissioned) instead of Polygon; 阿里云 OSS (WORM) instead of IPFS
- Notifications: 企业微信 / 钉钉 / 飞书 group bots and SMS instead of Slack
- Admin › 数据驻留与合规: hosting region, PIPL/DSL, cross-border transfer setting, 等保 level, ICP 备案号 field

**Mainland performance**
- Google Fonts no longer blocks render. It is unreachable from the mainland and was hanging first paint. CJK text uses OS fonts (PingFang SC / Microsoft YaHei), so no multi-MB web font is downloaded.
- Route-level code splitting: the entry chunk dropped from ~1.1 MB to ~60 KB, and charts load only where they are used.
- Removed three dead, unrouted pages and inline `<style>` leaking into the DOM.

## 3. Gaps: what still blocks a real China launch

Ordered by launch-blocking severity. Most of these are **business/legal**, not UI.

| # | Gap | Why it matters | Owner | Effort |
|---|---|---|---|---|
| 1 | **No backend.** All data is mock. | Nothing persists; no multi-user workflow. | Eng | L |
| 2 | **Mainland hosting + ICP filing (ICP 备案).** | A public site served from the mainland needs an ICP filing, which needs a Chinese legal entity (or a local partner). Without it, serve from Hong Kong and accept the latency. | Legal / Ops | M (weeks) |
| 3 | **PIPL / Data Security Law cross-border data.** | If mainland personal data leaves China (e.g. to the EU AWS region), you need a standard contract filing, certification or a CAC security assessment. Simplest path: a separate mainland deployment and a data plane that never leaves the mainland. | Legal / Eng | M |
| 4 | **Generative-AI filing.** | Public GenAI services in China must use a filed model (《生成式人工智能服务管理暂行办法》). AI Studio must call a mainland-filed model endpoint for cn tenants, not a foreign API. | Eng / Legal | M |
| 5 | **Blockchain information service filing.** | Blockchain services offered in China need a CAC filing (《区块链信息服务管理规定》). Use a filed BaaS (BSN / ChainMaker operator) and confirm whose filing covers you. | Legal | S–M |
| 6 | **Real SSO / SMS.** | WeCom, DingTalk and Feishu OAuth apps plus an SMS provider (Alibaba Cloud SMS needs approved signature/templates). | Eng | M |
| 7 | **等保 2.0 (MLPS) assessment.** | SOEs and large listed clients usually ask for Level 3. | Sec / Ops | L |
| 8 | **Native-speaker review of Chinese copy & framework text.** | The translations are high quality but machine-authored; regulator terminology must be checked against the source texts by a Chinese ESG professional. | Content | S |
| 9 | **Report output in Chinese.** | Report Builder export needs Chinese PDF typesetting (embedded CJK font subset), the exchange's prescribed structure/index tables, and 电子签章 (e-seal) for board sign-off. | Eng | M |
| 10 | **Excel import templates.** | Chinese data owners overwhelmingly submit via Excel. Bulk import/export per section is expected. | Eng | S–M |
| 11 | **Emission-factor maintenance.** | MEE updates the grid factor and sector guidelines periodically. Factors must be versioned with effective dates; the national carbon market now covers power, steel, cement and aluminium. | Content / Eng | S |
| 12 | **Payments & contracting.** | CNY invoicing (发票/fapiao), Alipay/WeChat Pay or bank transfer, and a mainland contracting entity. | Finance | M |
| 13 | **Support channels.** | WeChat/WeCom support group, 400 number, and Chinese help docs. | CS | S |

## 4. Recommended sequence

1. **Decide the operating model** (blocks 2–5): your own mainland entity vs. a local partner/reseller vs. a Hong-Kong-hosted "light" edition for A+H companies. This decides hosting, ICP, PIPL and GenAI paths.
2. **Backend MVP** with tenant isolation and region-pinned storage (Alibaba Cloud Shanghai for cn).
3. **Native expert review** of CN-SSE / HKEX / CSDS questionnaires and the Chinese UI copy.
4. **Real identity** (WeCom first; it's the most common in listed companies), then DingTalk/Feishu.
5. **Chinese report export** (PDF + index table + e-seal), then Excel bulk import.
6. **等保 Level 3** before the first SOE deal.

## 5. Facts to verify before showing to a regulator-savvy client

No article numbers or quotes were invented. CN-SSE/CSDS items are referenced by topic, not article. These points still need expert confirmation:

- The exact title and issue date of the MOF climate standard (《企业可持续披露准则第1号——气候（试行）》).
- The CASS-ESG 5.0 top-level structure (modelled as G / E / S / V value creation).
- HKEX revised Code: removal of the old A4 in favour of the climate part, and the Scope 3 obligation level. The demo treats Scope 3 as optional.
- The national carbon market surrender deadline. It is shown as "per MEE annual notice", without a date.
- Natural-gas factor 2.162 tCO₂/千m³ (some guideline editions give ≈2.165).
- Global-tenant planning dates (MSX 2027-03-31 is an estimate).

## 6. Known demo-data limits

- The global tenant's data is dated 2024–25, so some "in review for N days" counters look stale. The CN tenant is current (FY2026).
- Carbon price (CNY 90/t), green-investment and some evidence-summary figures are illustrative constants.
- Placeholder hosts (`*.example`, `relayer-cn.aeiforo.com`) are used for chain nodes and emails.

## 7. Not done in this pass

- No Mobbin MCP was connected in this session, so no Mobbin references were pulled. Design decisions follow established enterprise-SaaS patterns and the existing Nexus design system.
- All integrations are UI/configuration with demo data. No live connector, SSO, chain or SMS calls exist.
