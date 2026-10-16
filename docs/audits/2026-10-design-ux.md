# Nexus: design and UX audit ("bolder evolution")

Repo: `/Users/kick/Desktop/Aeiforo/reporting dash` on branch `china-edition-v2` (HEAD `1782283`). Read-only audit. No project files were edited. Every `/api` call was mocked, and every request to a host other than localhost was aborted. The exception is one opt-in comparison run (`FONTS=1`), which allowed Google Fonts through.

## How to reproduce

- Harness: `audit-design/shots.cjs`
  - Usage: `node shots.cjs <en|zh> <light|dark> <desktop|mobile> <rich|empty|slow|error> <full 0|1> <routes…>`
  - `rich` serves 34 assignments across 3 entities, 4 people, periods, an audit trail, anomalies, notifications and a published FY2025 report.
  - `empty` returns empty arrays. `slow` delays every API call by 15 s, so you see the loading state. `error` returns HTTP 500 for everything except `/auth/me`.
- Interaction flows: `audit-design/interact.cjs`, selected with `STEPS=tasks,entry,review,publish,assign,answer,palette,cjk`.
- Screenshots: `audit-design/shots/` (123 files), named `{lang}-{mode}-{vp}-{state}-{route}.png`. Interaction shots are named `…-ix-{step}.png`.
- Side-by-side montages: `audit-design/m_*.png`. They are listed in the appendix.
- Fonts: by default, web fonts are blocked. This matches what a mainland-China user sees, because Google Fonts is unreachable there. `m_fonts.png` compares the page with web fonts (left) and without them (right).

---

## 1. Current visual system

### What is coherent (keep it)
- **Shell.** The dark ink sidebar (`--bg-inverse #0F1F24`) with emerald active states, plus a translucent blurred top bar, already reads as "Workiva-grade". Information architecture is grouped as WORK / REPORTS / DATA / ANALYTICS / ADMIN.
- **Emerald as the single brand accent.** `--accent-50…700` with light and dark aliases. In light mode, `--color-brand-strong` is `#065F46`, so white text on it reaches about 7.6:1.
- **CJK groundwork is real.** There is a CJK fallback stack in every font token. `html:lang(zh-CN)` resets tracking and raises leading to 1.6/1.35. Uppercase and tracking are neutralised for CJK.
- **Card and data-table primitives.** `.surface-paper`, `.data-table` with `num` and tabular-nums, `.kicker`, `.chip` and `.kbd` are a good base.
- **Some framer-motion primitives exist.** `FadeIn`, `Stagger`, `MetricCard` count-up, `AnimatedNumber`, and a `layoutId` on PipelineJourney. There is also a CSS reduced-motion guard.

### What is drifting (measured in `src/`)

| Area | Evidence |
|---|---|
| **Three type ramps** | `tailwind.config.js` fontSize (xs 11 / sm 13 / base 15). CSS `--text-*` (11 / 12.5 / 13.5 / 15 / 18 / 22 / 28 / 34). `--text-premium-*` (12 / 14 / 16 … 72). On top of these, **30 distinct arbitrary `text-[Npx]` sizes** appear: `text-[10px]` ×441, `[11px]` ×229, `[12px]` ×160, `[13px]` ×159, `[12.5px]` ×99, `[10.5px]` ×86, `[9px]` ×81, `[8px]`/`[8.5px]` ×11. |
| **Page titles render at different weights** | `PageHeader` uses `className="text-display"`, which is **never defined** (it is used in 8 files). `.backdrop-mesh` (the hero variant) is also undefined. The result: My Tasks, Values, Publish Centre and Analytics have H1s at weight 400 (`en-light-desktop-rich-my_tasks.png`, `…-reports-full.png`), while My Day uses `.h-display` at weight 800 (`…-root.png`). |
| **Fonts** | Four families are loaded from Google (DM Sans, Instrument Sans, Inter, JetBrains Mono). `Inter Display` is referenced but never loaded. DM Sans is loaded only at 400–600, yet `font-bold` appears 262 times, so the browser fakes bold. `.h-display` asks for weight 800, but Inter is loaded only up to 700. In mainland China none of these load. The first available face is then PingFang SC, which renders Latin text, so GRI codes such as `305–1` and dates get PingFang's wide hyphen (`…-admin_assignments.png`). |
| **Undefined tokens** | `--shadow-glow-teal` (6 uses), `--gradient-brand-soft` (4), `--surface-2`, `--color-brand-hover`, `--shadow-md`, `--shadow-lg`, `--bg-page`, `--accent`. The design-system `EmptyState` icon tile depends on two of these, so it renders with no background. |
| **Palette bypass** | 443 raw Tailwind palette classes (`text-teal-400`, `bg-amber-500`, `border-red-500`, …) and hex values in 33 files. The **old teal brand `#1B6B7B` is hard-coded 25 times**. The sidebar uses `#2fa98e`. Analytics scopes use `#0F7B6F`, `#2563EB` and `#7C3AED`, and the actual-emissions line uses `#EF4444`. |
| **Component duplication** | 2 Skeleton components. One uses `bg-white/[0.04]`, which is **invisible on light** (`m_slow1.png`). The other uses `.skeleton`, whose shimmer animates `background-position` on a gradient with no `background-size`, so it never moves. 2 EmptyState components. 4 status-pill implementations (Badge/StatusBadge, `mytasks/StatusPill`, AssignmentManager inline, editor inline). Buttons exist as the DS `<Button>` (67 uses in pages), raw `<button>` (323), and CSS `.btn-primary`, which has a gradient and lift. Cards exist as `.surface-paper` (79) and `.card-premium` (14). On light, `.card-premium` is a translucent slate tint, which is why My Day's hero cards look grey and muddy. |
| **Elevation** | The tokens state "one elevation", but Tailwind `shadow-*`, 16 arbitrary `shadow-[…]` values and the `.btn-primary` glow are all in use. Radius drift: Tailwind `lg` = 14 px but `--radius-lg` = 10 px, plus `rounded-[8/10/6/12/16/5/4/9/7/14px]`. |
| **Motion vocabulary** | Three modules: `lib/motion.ts` (250 ms, ease `[.22,1,.36,1]`), `components/motion.ts` (SPRING 260/28, 60 ms stagger, 12 px rise), and `MotionPrimitives` (40 ms stagger, 8 px). Add CSS `--dur-*` at 120/160/200 and `--dur-premium-*` at 100–600. `PageTransition` uses `AnimatePresence mode="wait"`, which adds about 280 ms of dead time per navigation, and then each page runs its own PageHeader and Stagger entrance, so there are two entrance animations. There is no `MotionConfig reducedMotion="user"`, so framer animations ignore reduced-motion (the CSS guard covers CSS only). `duration-250` is not in the Tailwind scale (3 uses, a no-op). `Table` uses `duration-[var(--transition-fast)]`, which is an invalid value because the token includes an easing. |
| **Dark theme** | The dark block declares teal values and then overrides them with emerald aliases (dead code). In dark mode, `--bg-inverse` equals `--bg-app` (#0B0E13), so the signature dark sidebar dissolves into the canvas (`zh-dark-desktop-rich-root.png`). |
| **i18n leaks in design-system components** | `ProgressRing` hard-codes "percent" and reuses one `id="ring-gradient"` across all instances. |

---

## 2. Issues by flow (P0 = broken, misleading or inaccessible; P1 = significant friction; P2 = polish)

### Cross-cutting
- **P0 (dark mode): primary buttons fail contrast.** In dark mode `--color-brand-strong` is `--accent-300` (#6EE7B7), and buttons put `text-white` on it, giving **about 1.5:1**. This affects "Open in editor", "Publish report", "Continue", "Start working" and active journey chips (`zh-dark-desktop-rich-root.png`, `en-dark-desktop-rich-reports.png`, `m_zh_admin.png` right).
- **P0 (CJK): tiny text.** A computed-style scan of the ZH UI (`interact.cjs STEPS=cjk`) counted visible text nodes containing Chinese:

  | Route | CJK text nodes under 12 px |
  |---|---|
  | `/my-tasks` | 112 of 187 |
  | `/admin/assignments` | 117 of 189 |
  | `/work/review` | 51 of 96 |
  | `/disclosure-editor` | 49 of 99 |

  The smallest are 9 px and 8.5 px. Hanzi below 12 px are not legible on Windows (Microsoft YaHei hinting). Section eyebrows such as "今天到期" and "未完成的指派" render at 10.5 px.
- **P0 (CJK): pills and dates break mid-word.** Status pills break inside words: 进行/中, 已提/交, 未开/始, 已批/准. Dates break as 2026-10-/10 (`zh-light-desktop-rich-admin_assignments.png`). On mobile, "提交批准" stacks one character per line inside the button (`m_ix5.png`), and the pipeline labels stack vertically, e.g. 设/置/组/织 (`m_mobile_zh1.png`).
- **P1: no page-level error boundary.** The ErrorBoundary sits at the App root, so any page crash removes the sidebar and top bar (`m_ix2.png` right). Wrap each route inside `AppShell` instead.
- **P1: dual breadcrumbs.** The top bar shows "Work / Tasks" and the page shows "Work > Tasks" again. Some pages show "Hi, Li" in the top bar instead (editor, welcome).
- **P1: names drift for the same destination.**
  - Assignment manager: route `/admin/assignments`, top bar "Admin / Values", page breadcrumb "Data > Values", H1 "Values".
  - Reports: nav "Active Reports", H1 "Publish Centre", palette "Publish centre".
  - Library: nav "Disclosures Library", palette "GRI index".
  - Home: nav "My Day", palette "Overview".
  - The palette's Recent list shows the raw slug "my-tasks" (`en-light-desktop-ix-palette.png`).
- **P1: the journey bar highlights two stages at once.** `JourneyBar` treats a stage as active when `state==='active' || key===highlight`, so Review queue shows both Collect and Review as active. Onboarding (stage "Set up org") highlights Collect (`…-onboarding-full.png`).
- **P2: tracked uppercase eyebrows everywhere.** Section labels are uppercase and tracked (`tracking-[0.14em]`) throughout. That adds noise in EN and is neutralised in ZH, where it becomes an undersized grey label instead.

### Onboarding and setup (`/welcome`, `/onboarding`, product tour)
- **P1: setup is fragmented.** It is spread across `/welcome` (a 5-step wizard), `/onboarding` (the entity tree), `ProductTour` (4 steps), `GuidedTour`, `SetupGuide`, `QuickStartCard` and `DemoSeedCta`. A new admin has no single path through them.
- **P1: the welcome wizard is a bare form.** It is three native selects on an empty 1440 canvas, with no illustration, no explanation of value and no preview of the result (`en-light-desktop-rich-welcome-full.png`, `m_zh_admin.png`). The Workiva and Watershed onboarding patterns pair each step with a visual and a "what you'll get" panel.
- **P2: the onboarding tree card has about 300 px of empty space.** "Ready to collect data?" is the real next action, but it sits at the bottom of the right rail (`…-onboarding-full.png`). The tour card is generic and centred over content (`en-light-desktop-rich-root-TOUR.png`).

### Dashboard (My Day, `/`)
- **P1: the hero is not about the work.** The progress bar under the greeting is calendar-quarter elapsed time ("Q4 reporting period · 77 days remaining"), not the reporting period's readiness or deadline, even though `periods.submission_deadline` exists. The page has no dominant number.
- **P1: card actions leave Work context.** "Start the next" and "Open in editor" go to `/data/entry/:id` (legacy DataEntry). The sidebar context jumps to DATA > Values, and the entry UI differs from the My Tasks AnswerPanel (`m_ix1.png`). See section 3.
- **P1: the activity feed shows raw strings,** e.g. "Zhang Min assignment submitted assignment" (`…-root-full.png`).
- **P1: hero cards look muddy.** `card-premium` on light is a translucent grey tint with an amber border. Card heights are uneven (280 / 440 / 300 px). The Suggested next card is a single item with large empty space.
- **P2: the KPI strip is flat numbers** with no trend or sparkline. In the empty state the hash chain shows a red "Broken" for an empty chain (`m_empty1.png`), which should be a neutral "No anchors yet".
- **P2 (loading): skeleton bars are invisible on light,** so the hero cards render blank (`m_slow1.png` left).

### Assignment manager (`/admin/assignments`)
- **P1: density without structure.** 28 rows at 52 px, all flat, with no grouping by entity or section. The Due column wraps ("2026–10–/10"), "IN PROGRESS" wraps onto two lines, and a trash icon is always visible on every row (`…-admin_assignments-full.png`). There are no row checkboxes, even though Bulk assign exists.
- **P1: two summary encodings compete.** Pastel tiles (green / blue / yellow) sit next to coloured status pills. In dark mode the tiles become heavy navy and olive blocks.
- **P2: assignee emails** add a second line to every row. Show them only on hover or in a tooltip.
- **P2: the New assignment drawer** is a good 6-step pattern (`m_ix3.png` left), but it has no progress feedback. Bulk assign uses native selects and a raw `dd/mm/yyyy` field.
- **P2: the content column sits at x=328 px**, while other pages start at 280 (different max-width and gutter).

### My Tasks and the answer panel (`/my-tasks`)
- **P0: the page reports false success.** The banner "All your disclosures are submitted, Li. Good work." and "You're caught up" appear:
  1. while data is loading (`m_slow1.png` right),
  2. when the API errors (`m_err1.png` right), and
  3. when nothing is assigned (`m_empty1.png` right).
- **P1: three "next action" modules stack above the list.** "Do this next", the 6-stage Pipeline and the "Up next" focus card all sit above it, so the first task row is at y≈1000 (`…-my_tasks-full.png`).
- **P1: the modules contradict each other.** The banner says "8 disclosures open" while the tile says "Open 3". It says "Do this next · APPROVE" while the pipeline says "You work at 01 · Set up org". The sidebar badge shows 2 and My Day says 17 open.
- **P1: grouping is wrong.** The "Due today" group contains submitted items due 1 Oct and 15 Oct. Approved items are mixed into "This week". Each row carries three colour encodings: the left bar, the date pill and the status pill.
- **P1: the answer panel uppercases its label, which corrupts units.** "ENTER VALUE (TCO2E)" (`m_ix4.png`). The panel has no historical or compare context, although the separate DataEntry page does. Submit gives no visible success moment.
- **P1 (mobile): pipeline labels collide** ("Apprové Publish"), the "UP / NEXT" label wraps, and the task title truncates to "其他间接（范围三…" (`m_mobile_en1.png`, `m_mobile_zh1.png`).

### Review and approval queues (`/work/review`, `/work/approval`)
- **P0: the queue reports a false empty state.** On API error or while loading it shows "Queue is empty / 0 / 0 / 0" (`m_err2.png` left, `m_slow2.png` left), so a reviewer would conclude there is nothing to do.
- **P1: the decision is far down the page.** "Pass to approval" and "Send back" sit at y≈1718 on a 900 px viewport, below the facts, data-quality checks, a 900 px historical panel and the comments (`…-work_review-full.png`). There is no sticky decision bar, no next or previous navigation and no keyboard shortcuts.
- **P1: feedback uses browser `alert()`.** The required-comment check fires a native alert ("Please leave a short comment…"). There are 20 `alert()` and `confirm()` calls across the app. A successful pass shows no toast or row exit (`m_ix2.png` left).
- **P1: the submitted value is compact-formatted.** It shows "1.9k" next to "1.94k" in the chart. Reviewers need the exact figure (1,937.3). The history chart's y-axis prints "00.00" and "0.000". The "Σ 73.71" stat is meaningless. The FY2026 point floats unconnected (`…-work_review-full.png`).
- **P2: the queue column leaves about 900 px of white space** below 5 items.

### Disclosure editor (`/disclosure-editor/gri`)
- **P1: three-pane layout is right, but the right pane wastes space.** It is an empty "Select a disclosure" state at about 340 px wide. Cells are plain inputs. Status chips are 9–10 px. Section and subsection labels leak English in ZH: "Emissions", "Diversity", "GOVERNANCE", "Anti-corruption" (`zh-dark-desktop-rich-disclosure_editor_gri.png`).
- **P1: "Publish report" is disabled with no explanation,** and the dark-mode contrast problem applies. "Solo mode" is a 10 px ghost chip.
- **P1 (mobile): the header truncates** to "GRI S…" and the "IN REVIEW" pill wraps (`m_mobile_en2.png`).
- **P2: the error state** is a small pink box floating at the top (`m_err2.png` right).

### Report builder and publish (`/reports`)
- **P0: Publish has no confirm or preview step.** Clicking "Publish report" posts `publish-report` immediately, at 4/28 approved and unaudited ("will publish as DRAFT"). It is an irreversible, hash-anchored action with no review sheet (`interact.cjs` log). After a non-standard response the page crashed into the full-screen error boundary (`m_ix2.png` right).
- **P1: the readiness card is the right idea but visually weak.** A thin teal-gradient bar shows 14%, the tiles are pastel, and there is no checklist of what blocks publishing.
- **P1 (mobile): the readiness heading wraps one word per line** ("4 / of / 28 / disclosures") because the "Unaudited" box floats beside it (`m_mobile_en2.png`).
- **P1 (empty state): dead end.** "No periods set up. Create one in Admin → Reporting cycles." is plain text with no button (`m_empty3.png` right).

### Analytics (`/analytics`)
- **P1: charts look like library defaults.**
  - The target-gap chart shows "actual" as a thick red line with only two points (2021 and 2026) and a green-dashed pathway.
  - Scope colours are the hex values `#0F7B6F`, `#2563EB` and `#7C3AED`, which are off-brand.
  - Legends are detached and tick labels are 9–10 px.
  - (`…-analytics-full.png`)
- **P1: the DQI section is cramped.** The DQI ring and five sub-score tiles have labels colliding with weights ("COMPLETENESS35%"), and ZH truncates "0/3 同比变动在 ±20…" (`zh-dark-desktop-rich-analytics.png`).
- **P2: two dashed empty cards** ("Emissions by plant × scope", "Material topic coverage") occupy half of the first two rows.

### Settings (`/settings`)
- **P1: one 4,200 px column.** 23 framework cards, each with a different-hue avatar tile (rainbow, off-brand), followed by Account security and Notification preferences. 2FA ("strongly recommended") is buried at y≈3,500. The subtitle says "Personal preferences" but the bulk of the page is workspace administration (`…-settings-full.png`). Use a sub-nav: Profile · Notifications · Security · Workspace · Frameworks · Integrations.
- **P2 (ZH): framework tags and metadata stay in English** ("Universal / Economic", "topic standards 2016–2020") (`m_zh_admin.png`).

### Mobile (390 px), general
- No horizontal page scroll anywhere (good).
- The top bar has 6 icon targets and titles truncate ("Active Rep…").
- Journey chips are clipped at the right edge with no scroll affordance.
- Stat tiles are 2×2 pastel blocks that push content below the fold (`m_mobile_en1.png`).

---

## 3. Flow problems
1. **Three different data-entry surfaces for the same task.**
   - The My Tasks inline `AnswerPanel` has value, comment, evidence and discussion, but no history.
   - `/data/entry/:id` (DataEntry) has compare sources and history. It is reached from My Day, and it moves the sidebar to DATA.
   - The disclosure editor has inline cells.

   Pick one canonical `AnswerSheet` (a right drawer on desktop, a full sheet on mobile) and open it from all three places.
2. **Too many "what next" signals that disagree.** The My Day hero cards, the My Tasks banner, the Pipeline, the Up-next card, the JourneyBar on most pages, and the sidebar badges all use different counts and roles. Consolidate into one `NextAction` model (from `lib/journey.ts`) and render it in two places only: the My Day hero and the My Tasks header.
3. **Review is a 3-scroll page.** Facts, then checks, then history, then the decision. Invert it: a sticky decision bar (Pass / Send back / Next), with the anomaly summary pinned on top and history collapsed.
4. **No feedback loop.** Approving, passing, submitting and publishing produce no toast, no row exit and no counter change. `alert()` handles validation.
5. **Dead ends and misleading states.**
   - The Reports "no periods" state has no link.
   - The My Tasks success copy appears on error, loading or zero assignments.
   - The queue shows an empty state on error.
   - The root error boundary removes navigation.
6. **Publish skips a review step.** There is no pre-publish sheet covering coverage, open items, assurance status and a preview thumbnail.
7. **Settings mixes personal and workspace scopes** in one scroll.
8. **Onboarding has 6 overlapping mechanisms.**

---

## 4. "Bolder evolution" direction (React + Tailwind + framer-motion, existing tokens)

### 4.1 Typography: one ramp, real display face, CJK-safe
- **Self-host the Latin fonts** (`/public/fonts/InterVariable.woff2` about 330 KB, or the Latin subset about 110 KB, plus JetBrains Mono Latin about 40 KB) using `@font-face` with `font-display: swap`. Drop DM Sans and Instrument Sans. Self-hosting also fixes mainland rendering (no Google dependency) and removes the faux bold.
- **Font stack:** `"Inter Var", -apple-system, "SF Pro Text", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif`. Latin is always Inter, and Hanzi always use the system face. Enable `font-feature-settings: "cv11","ss01","tnum"` on numerals only, via `.num`.
- **Single ramp.** Replace all three existing ramps. Use `text-[length:var(--fs-*)]`, or redefine Tailwind `fontSize` to these values:

  | Token | Size / line height | Weight | Tracking | Use |
  |---|---|---|---|---|
  | `display-xl` | 56/60 | 650 | −0.03em | My Day hero figure, publish moment |
  | `display` | 40/44 | 650 | −0.025em | Page H1 on hub pages |
  | `h1` | 28/34 | 600 | −0.02em | All other page titles (fixes the undefined `.text-display`) |
  | `h2` | 20/28 | 600 | | |
  | `h3` | 16/24 | 600 | | |
  | `body` | 14/22 | | | |
  | `small` | 13/20 | | | |
  | `caption` | 12/16 | | | Floor for every language |
  | `micro` | 11/14 | 600, uppercase, 0.06em | | **EN only**. Under `:lang(zh-CN)` it maps to 12/16, weight 500, no uppercase. |

- **Emergency CJK clamp** (one CSS rule, ship now):
  ```css
  html:lang(zh-CN) [class*="text-[8"],
  html:lang(zh-CN) [class*="text-[9"],
  html:lang(zh-CN) [class*="text-[10"],
  html:lang(zh-CN) [class*="text-[11"] { font-size: 12px; }
  ```
  Also add `white-space:nowrap; word-break:keep-all` to every pill, badge and date cell.
- **Numbers.** Add a `fmt.value(n, unit, {precision})` helper using `Intl.NumberFormat(locale)`. Use exact values in review, approval and entry. Use compact notation only in charts and KPI tiles; for zh-CN, compact notation gives 万/亿 instead of "k".

### 4.2 Colour, surfaces and elevation
- **Button tokens per mode:** `--btn-primary-bg` / `--btn-primary-fg`.
  - Light: `#047857` / `#fff` (5.5:1).
  - Dark: `#34D399` / `#03241A` (about 10:1). This gives a luminous mint button with dark ink, which reads as premium on dark.
  - Apply the tokens in DS `Button`, `.btn-primary`, journey chips and the editor publish button.
- **Keep the sidebar an ink surface in both modes:** `--bg-inverse: #0A1A17` (emerald-tinted ink). In dark, use `#070B0A`, with a 1 px `rgba(52,211,153,.08)` inner edge, so it stays distinct from the `#0B0E13` canvas.
- **Retire pastel stat tiles.** Use one **Ledger KPI strip**: paper surface with dividers instead of boxes, a 12 px caption, a 32/36 tabular figure, and an 8 px semantic dot instead of a full tint. Delta chip plus 48×16 sparkline.
- **Three elevation levels only** (redefine the existing tokens):
  - `--shadow-card: 0 1px 0 rgba(15,23,42,.04), 0 0 0 1px var(--border-subtle)`
  - `--shadow-raised: 0 1px 2px rgba(15,23,42,.06), 0 8px 24px -8px rgba(15,23,42,.12)` (hero, active card)
  - `--shadow-overlay` (the current `--shadow-modal`)
  - Dark mode: raised = `0 0 0 1px rgba(255,255,255,.06), 0 12px 32px -12px rgba(0,0,0,.6)` plus a 1 px top highlight `inset 0 1px 0 rgba(255,255,255,.04)`.
- **Card cleanup.** Delete `.card-premium` and keep `.surface-paper` plus a new `.surface-hero`. The hero has a radial emerald wash: `radial-gradient(120% 80% at 0% 0%, rgba(16,185,129,.08), transparent 60%)` plus a contour pattern (see 4.5).
- **Replace hard-coded colours.** Swap 443 palette classes and 25 instances of `#1B6B7B` for semantic tokens (`--status-*`, `--chart-*`). Add an ESLint `no-restricted-syntax` regex on `/#[0-9a-f]{6}|(text|bg|border)-(teal|amber|red|blue|emerald)-\d{3}/` for `pages/**`.

### 4.3 Data visualisation style (`<ChartFrame>` wrapper over Recharts)
- **Tokens:**
  - `--chart-s1: #065F46`, `--chart-s2: #10B981`, `--chart-s3: #6EE7B7`. Scopes form a sequential emerald scale, which is on-brand and ordinal.
  - `--chart-ink: var(--text-primary)` for actuals.
  - `--chart-target: var(--accent-500)`, dashed `4 4`.
  - `--chart-risk: var(--status-danger)`, reserved for gap annotations.
  - Categorical extras: `#0EA5E9`, `#6366F1`, `#F59E0B`, `#64748B`.
  - Dark variants are lifted one step.
- **Marks.**
  - Horizontal gridlines only, 1 px `--border-subtle`. No axis lines.
  - Ticks at 11 px (12 px in zh), tabular, `--text-tertiary`.
  - Direct end-of-line labels instead of legends.
  - Area fills: 12% to 0% vertical gradient.
  - Bars with a 4 px top radius and 2 px gaps between stack segments.
  - Tooltips are a `surface-paper` card with a 12 px caption and a 16 px tabular value.
- **Target-gap chart.** Actuals are an ink line with filled dots. The pathway is a dashed emerald line. The gap is a shaded band between them in `--chart-risk` at 10%, with the label "+2.4k tCO₂e above pathway" placed at the last actual.
- **Historical panel.** Fix the y-axis formatter. Show FY2026 as a hollow "pending" dot connected by a dashed segment. Replace "Σ" with "Δ vs 3-yr avg".
- **Animate on first view.** Draw lines with `pathLength` 0→1 over 0.6 s with ease `[.22,1,.36,1]`. Bars grow `scaleY` from the baseline with a 30 ms stagger. Gate on `useInView({ once: true })`.

### 4.4 Signature motion moments (one tokens file: `src/motion/tokens.ts`)
- **Tokens:**
  - `dur = { micro: .12, fast: .18, base: .24, slow: .4, draw: .6 }`
  - `ease = { out: [.22,1,.36,1], inOut: [.65,0,.35,1] }`
  - `spring = { snappy: { stiffness: 520, damping: 40 }, gentle: { stiffness: 300, damping: 32 }, ticker: { stiffness: 90, damping: 22 } }`
  - `stagger = .03`, capped at 8 children.
- Wrap the app in `<MotionConfig reducedMotion="user" transition={{ duration: dur.base, ease: ease.out }}>`.
- **Page transitions.** Remove `mode="wait"` and the exit animation. Enter with opacity 0→1 and y 4→0 over 160 ms. Let `PageHeader` own the stagger (eyebrow, then title, then actions, 30 ms apart).
- **Shared-layout indicators** (`layoutId`):
  - Sidebar active pill: `layoutId="nav-active"`, spring snappy.
  - Tabs, ViewToggle and queue filter underline.
  - JourneyBar current-stage ring.
  - Status pill in TaskRow, so that on submit it morphs from "Draft" to "Submitted" in place before the row animates into its new group with `layout`.
- **NumberTicker.** One component that replaces `AnimatedNumber` and `MetricCard.CountUp`. It does a per-digit vertical roll (each digit column `translateY(-n×1em)` via `useSpring(ticker)`), uses `Intl` formatting and tabular-nums, animates on first in-view and on value change only, and is used in KPI ledgers, readiness and DQI.
- **Approval celebration** (restrained, Workiva-grade, no confetti):
  1. On Pass or Approve, the decision bar button morphs to a check (`AnimatePresence` icon swap, 180 ms).
  2. An SVG "seal" (a 20 px circle plus a check) draws in with `pathLength` over 0.4 s.
  3. The queue row exits with `height` animating to 0 and `x: 24` over 240 ms.
  4. Queue counters tick down.
  5. The next item auto-selects with a 120 ms crossfade.
  6. When the queue empties: a "Queue cleared" empty state whose emerald ring scales 0.8→1 with a soft ripple (two concentric circles, opacity .3→0, 0.9 s), followed by the contour illustration.
- **Submit (contributor).** The AnswerPanel collapses, a toast reads "Submitted to Zhang Min for review" with an Undo action for 5 s, and the stats strip "Submitted" ticks up.
- **Publish moment.** A full-width sheet shows the PDF thumbnail sliding up, the SHA-256 typing out in mono (40 ms per character, with the first 12 characters animated), and an "Anchored" seal draw. Show this only once per publish.
- **Progress.** The readiness ring's segmented donut animates segments sequentially (approved, then in review, then open). The editor's top progress bar uses `spring.gentle` on width.

### 4.5 Illustration and asset system
- **Motif:** topographic **contour lines** (leaf and terrain). These fit sustainability without stock-photo clichés.
- **Spot illustrations:** about 12, each a 120×96 SVG with a 1.5 px stroke in `currentColor` (`--accent-600` light, `--accent-300` dark), a fill of `--accent-50` or `rgba(16,185,129,.08)`, and one ink accent. They are themable through CSS variables, so dark mode works for free.
  - Set: tasks-done, queue-cleared, no-periods, no-reports, no-evidence, no-data, connectors, error (a broken contour), offline, 5 onboarding steps (org tree, frameworks, people, data, publish).
  - Extend the existing `data/illustrations.ts` (5 assets) rather than starting over.
- **Mount animation:** contours draw with `pathLength` over 0.8 s, staggered 60 ms. Reduced-motion users see a static image.
- **Background pattern:** a `contour.svg` at 4% opacity (6% in dark) on the My Day hero, the welcome wizard, the publish sheet and the login page.
- **Empty-state contract** (one DS `EmptyState`; delete the other): illustration, then title (h3), then one line, then one primary action plus an optional secondary action. Variants:
  - `empty` (nothing exists yet; teaches the next step)
  - `cleared` (celebratory)
  - `filtered` (offers to clear filters)
  - `error` (retry, with the API message tucked into a disclosure)
  - `loading` (skeleton)

  These replace the current behaviour where empty, loading and error all render the same success copy.

### 4.6 Dashboard hero (My Day)
- **Row 1 (`surface-hero` with contour wash):**
  - Left: the greeting at h1, then a `display-xl` figure: "**14%** of FY2026 approved". Below it: "45 days to submission deadline · 5 overdue". Data comes from `periods` and `framework-progress`.
  - Right: a 160 px segmented readiness donut (approved, in review, open) with a NumberTicker in the centre, plus a deadline countdown chip.
- **Row 2: one "Your next action" card spanning 8 of 12 columns.** It shows the single highest-scored item with its GRI code, entity, an overdue chip and a primary "Answer now" button that opens the AnswerSheet, not `/data/entry`. To its right, a 4-column "Waiting on you" stack: review count and approval count, each a large number with an arrow.
- **Row 3:** the KPI ledger strip with sparklines (open, approved this week, critical anomalies, hash chain).
- **Row 4:** the activity timeline with humanised verbs ("Zhang Min submitted 305-1 Scope 1 · Shanghai Plant") and avatars, grouped by day.

---

## 5. Prioritised implementation list

### A. Shared primitives first (unblock everything)
1. **P0 Button and contrast tokens.** Add `--btn-primary-bg` / `--btn-primary-fg` per mode. Make DS `Button`, `.btn-primary`, JourneyBar active chips and the editor publish button use them. Files: `src/index.css`, `design-system/components/Button.tsx`, `components/JourneyBar.tsx`.
2. **P0 CJK safety.** Add the `:lang(zh-CN)` 12 px clamp. Add `nowrap` and `keep-all` to Badge, StatusBadge, StatusPill and date cells. Stop `text-transform: uppercase` on labels that contain units (wrap the unit in `<span class="normal-case">`).
3. **P0 Truthful states.** Add a `<StateBoundary loading error empty>` helper and adopt it in MyTasks (banner and focus card), WorkflowQueue (it currently has no loading or error branch) and MyDay (cards render "caught up" on error). Add a route-level ErrorBoundary inside `AppShell`.
4. **P1 Type ramp and fonts.** Define `.text-display` or migrate PageHeader to the new `h1`. Self-host Inter and JetBrains Mono, remove the Google font links, and replace the Tailwind `fontSize` scale with the new ramp. Then run a codemod to map `text-[9–11px]` to `caption`/`micro`.
5. **P1 One Skeleton and one EmptyState.** Use a skeleton built on `--bg-tertiary` with a working shimmer (`background-size: 200% 100%`). Build the EmptyState variants and the illustration set.
6. **P1 Motion tokens.** Create `src/motion/tokens.ts`, add `MotionConfig`, rewrite PageTransition, and build `NumberTicker`, `LayoutPill` and `SealCheck`. Delete `lib/motion.ts` and fold `components/motion.ts` into the tokens file.
7. **P1 Surface and elevation cleanup.** Delete `.card-premium`. Define the missing variables (`--shadow-glow-teal`, `--gradient-brand-soft`, …) or remove their uses. Replace the Ledger KPI strip and pastel tiles with one `StatLedger` component.
8. **P1 Toast-first feedback.** Replace 20 `alert()`/`confirm()` calls with sonner toasts and an `<ConfirmSheet>` component. Add Undo to destructive actions.
9. **P2 `ChartFrame`** with chart tokens, and a `fmt` number helper using `Intl`, with 万 in zh.
10. **P2 Lint guard** against raw hex and palette classes in `pages/**`.

### B. Per area
| # | Pri | Area | Change |
|---|---|---|---|
| 1 | P0 | Publish | Add a pre-publish `ConfirmSheet`: coverage ring, blocking items, assurance state, draft-watermark warning, PDF preview thumbnail. Then the publish moment. Show a tooltip explaining why Publish is disabled in the editor. |
| 2 | P0 | Review/Approval | Sticky decision bar (comment, Pass, Send back, Next; keys `J`/`K`/`A`/`R`). Exact value formatting. Inline validation instead of `alert`. Row exit, counter tick, auto-advance, "Queue cleared" state. Collapse history behind "Show 4-year trend". |
| 3 | P0 | Mobile ZH | Responsive PipelineJourney: on mobile, a horizontal scroll-snap stepper with only the current stage label. Decision buttons full-width and stacked. Fix the Reports readiness card layout (stack the badge under the heading below `md`). |
| 4 | P1 | My Tasks | Merge "Do this next", Pipeline and "Up next" into one `NextActionHeader`, with the pipeline as a slim 6-dot strip. Group by Overdue / Due this week / Later / Submitted / Done (collapsed). One status encoding per row (pill only, no left bar). Add history to the AnswerPanel. Use the canonical AnswerSheet. |
| 5 | P1 | My Day | The new hero (4.6). Route all "start" actions to the AnswerSheet. Humanise activity verbs. |
| 6 | P1 | IA / naming | One label per destination: "Assignments" (not "Values"), "Publish" or "Reports", "Disclosure library", "My Day". Remove the page breadcrumb when the top bar shows one. Fix the dual highlight in JourneyBar. Palette Recent should use page titles. |
| 7 | P1 | Assignment manager | Group by entity and section with sticky group headers. Row checkboxes plus a bulk action bar sliding up from the bottom (`layout`). Show the trash icon on hover only. Use `nowrap` dates formatted as `dd MMM`. Avatar stack instead of email. |
| 8 | P1 | Settings | Left sub-nav with tabs (Profile, Notifications, Security, Workspace, Frameworks). Frameworks become a compact grid of monochrome emerald or ink tiles, with region filter chips (Global / EU / China / US). |
| 9 | P1 | Onboarding | Merge `/welcome` and `/onboarding` into one 5-step split-screen wizard: left side is the form; right side is a live preview (entity tree building up with `layout` animation) plus a step illustration. Retire GuidedTour and SetupGuide in favour of one checklist card on My Day until setup is complete. |
| 10 | P1 | Analytics | ChartFrame restyle. Target-gap band. Emerald-scale scope bars. Fix DQI label collisions (put the weight on its own line). Hide empty-data cards behind a single "Unlock more analytics" checklist. |
| 11 | P1 | Dark mode | Ink sidebar distinct from canvas. Replace tinted tiles with the ledger. Remove the 1 px white "selected" borders and use an emerald ring `0 0 0 1px rgba(52,211,153,.5)`. |
| 12 | P2 | Disclosure editor | The right rail shows a section summary (progress, owners, open comments) when nothing is selected. 12 px status chips. Translate subsection labels. Cell save shows a check-mark tick. |
| 13 | P2 | ZH content | Translate framework tags and metadata, and framework badges ("topic standards 2016–2020"). Localise entity-type labels. |
| 14 | P2 | Mobile shell | Reduce the top bar to Menu, Title, Search and Avatar; move language, notifications and theme into the avatar sheet. Add a fade mask to the journey chips. |

---

## Appendix: screenshot index
- **Montages:**
  - `m_mobile_en1.png`, `m_mobile_en2.png`: EN mobile, light (My Day, Tasks, Review, Values / Editor, Reports, Analytics, Settings)
  - `m_mobile_zh1.png`: ZH mobile (dark ×3, light ×1)
  - `m_empty1-3.png`: empty states
  - `m_slow1-2.png`: loading states
  - `m_err1-2.png`: error states
  - `m_ix1-5.png`: interactions (start working, data entry, review pass, publish, new/bulk assign, answer panel EN/ZH, ZH mobile review)
  - `m_misc1.png`: approval queue, inbox
  - `m_fonts.png`: web fonts vs mainland fallback
  - `m_zh_admin*.png`: ZH settings, welcome, onboarding, reports
- **Full-page EN light:** `shots/en-light-desktop-rich-*-full.png` (root, my_tasks, admin_assignments, work_review, reports, analytics, settings, onboarding, welcome)
- **Per-route viewport shots** in `shots/` for every combination of {en, zh} × {light, dark} × {desktop, mobile}
