# E2E Testing with Playwright

End-to-end tests live in `e2e/` and run with [Playwright](https://playwright.dev/).
They cover smoke + happy-path flows that can be pointed at a local dev server,
a Vite preview build, or a deployed Vercel preview/production URL.

## What's covered

| Spec                       | Purpose                                                                                    | Needs DB? |
| -------------------------- | ------------------------------------------------------------------------------------------ | --------- |
| `auth.spec.ts`             | Login page renders; invalid credentials show error; register mode reveals workspace/name; forgot-password confirmation; demo-tile login (gated). | Partial — invalid login + demo tile hit the API. The render-only assertions do not. |
| `health.spec.ts`           | `/api/health` returns 200 or 503 with the documented shape (`ok`, `db`, `integrations.*`). | Yes — needs the API up. |
| `accessibility.spec.ts`    | Runs axe-core against public pages and fails on `critical`/`serious` WCAG 2.1 AA violations. | No (static render only). |
| `visual.spec.ts`           | Loads each public page and asserts zero console errors / page errors.                       | No. |
| `happy-path.spec.ts`       | Full live journey: sign in as platform admin → dashboard → my tasks → materiality.         | Yes — requires `E2E_DEMO_PASSWORD` and a seeded DB. |

## Run locally against the dev server

The Vite dev server proxies `/api/*` to the Node API (`scripts/dev-api.ts`).
For full coverage you'll want both:

```bash
# Start dev + API together in another shell
npm run dev:all

# Then run the tests
E2E_BASE_URL=http://localhost:5173 npm run e2e
```

Or have Playwright manage the dev server itself (UI-only — `/api/*` will 404
unless you also start `dev:api`):

```bash
E2E_LOCAL=1 npm run e2e
```

## Run against a Vercel preview

Anything reachable over HTTPS works:

```bash
E2E_BASE_URL=https://your-preview-xyz.vercel.app npm run e2e
```

## Run the full happy path

Needs the demo password used by the seeded role accounts:

```bash
E2E_BASE_URL=https://your-preview-xyz.vercel.app \
E2E_DEMO_PASSWORD=demo2026 \
  npm run e2e -- --grep "happy path"
```

Without `E2E_DEMO_PASSWORD` the spec self-skips so CI doesn't fail.

## Interactive / debug runs

```bash
npm run e2e:ui       # Playwright UI runner
npm run e2e:headed   # Headed Chromium
```

## CI integration

Recommended flow:

1. Vercel deploys a preview for the PR.
2. A GitHub Actions job waits for `deployment_status: success` for the preview.
3. It then runs:

   ```bash
   E2E_BASE_URL=$PREVIEW_URL npm run e2e
   ```

   The `reporter: 'github'` setting in `playwright.config.ts` already emits
   annotations into the PR check output. Add `E2E_DEMO_PASSWORD` as a repo
   secret to unlock the live happy-path test.

## Artefacts

`playwright-report/` and `test-results/` are git-ignored. On failure,
screenshots/videos/traces are written there for local triage and uploaded
as CI artifacts (configure that in your workflow).
