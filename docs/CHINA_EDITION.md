# China edition

Branch: `china-edition-v2`. Adds Simplified Chinese and mainland-China support to the existing platform. No existing feature, route or workflow was removed or changed in behaviour.

## What's included

**Simplified Chinese UI**
- `zh` is registered in i18next (`src/i18n/index.ts`), and 简体中文 is in the TopBar language menu.
- Per-area dictionaries live in `src/i18n/locales/{en,zh}/<area>.json`, mounted as `t('<area>.…')`. There are about 5,400 keys, and en and zh have identical key sets.
- Thai has no area files yet, so new keys fall back to English in Thai.
- Questionnaire text shows `line_item_zh` when the UI is Chinese (`src/lib/itemLabel.ts`). `line_item` stays canonical and is still the conflict key.
- Framework catalog entries carry `nameZh` / `bodyZh` / `descriptionZh` (`src/lib/frameworks.ts`).

**China framework question sets** (`api/_cnSseSeed.ts`, `_cnCsdsSeed.ts`, `_hkexEsgSeed.ts`, `_cassEsgSeed.ts`)

| id | Framework | Items |
|---|---|---|
| `cn-sse` | 沪深北交易所《上市公司自律监管指引——可持续发展报告（试行）》 | 90 |
| `cn-csds` | 财政部《企业可持续披露准则——基本准则》+ climate standard | 40 |
| `hkex-esg` | 港交所《环境、社会及管治守则》(Appendix C2) | 74 |
| `cass-esg` | CASS-ESG 5.0 | 38 |

- These seeds do **not** auto-enable for any org; orgs opt in via Settings › Frameworks.
- They upsert NULL-safely, unlike the older seeds, which re-insert NULL-`scope_split` rows on every `/api/setup` run.

**Mainland readiness**
- Fonts: Google Fonts no longer blocks render (it is unreachable from the mainland), and every font stack falls back to PingFang SC, Microsoft YaHei and similar system fonts.
- Emission factors (`api/_efCnFactors.ts`, wired into `/api/setup`): MEE national grid factor 0.5703 kgCO2e/kWh, plus GB/T 32150 fuel factors.
- Connectors: Kingdee, Yonyou, DingTalk, Feishu, WeCom, Alibaba Cloud IoT, State Grid metering and the national carbon-market export. All are **coming soon**: they are listed and disabled, never connectable.
- Notifications: DingTalk, Feishu and WeCom group-bot senders (`api/_notifyChannels.ts`), configured by environment variables.
- Demo client: `npm run seed-cn` creates 绿源控股集团 with 5 subsidiaries, 11 users and 22 assignments. It must be run manually and refuses to run in CI or on Vercel.

## Before merging to `main`

Every push to `main` runs `/api/setup` on production. That will:
- add the `line_item_zh` column (nullable, additive),
- insert the four China question sets (not enabled for any org),
- insert the China emission factors (insert-only).

None of these change existing rows.

## Open decisions

1. **IM notifications are org-wide env vars.** `NOTIFY_IM_ORG_IDS` must list the orgs allowed to post, because one webhook means one group chat. Per-org webhook settings need a storage table and API.
2. **Data residency and ICP 备案号.** `organisations.region` only allows us/eu/apac, and there is no API-backed org profile. Both need a schema change first.
3. **CN grid factor preference.** Two CN grid rows now exist: IEA 2024 (0.556) and MEE (0.5703). Lookups that sort by `valid_from` pick IEA, so decide whether CN orgs should prefer MEE.
4. **Section and subsection headings** in the questionnaire tree are English-only in the database. A fully Chinese tree would need `subsection_zh`.
5. **Native expert review** of the regulatory wording. These points are flagged as uncertain:
   - HKEX Scope 1/2 placement and the LargeCap phasing;
   - the final text of the CSDS climate standard;
   - the CASS-ESG 5.0 indicator list;
   - several CN-SSE item phrasings.
6. **Glossary definitions** (`src/data/glossary`) shown in JargonTooltip are still English.
7. **Mainland hosting, ICP filing, PIPL cross-border rules, GenAI and blockchain service filings** are legal and infrastructure decisions, not code.
