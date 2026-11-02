import { readFileSync } from 'node:fs'
import { test as base, expect, type Page } from '@playwright/test'

export const DEMO = { email: 'user1@marklytics.co.uk', password: 'marklytics' }

/** Every routable path, read from the app's route table so new pages are covered automatically. */
export function appPaths(workspace: 'lvyuan' | 'aeiforo'): string[] {
  const src = readFileSync(new URL('../src/app/routes.tsx', import.meta.url), 'utf8')
  const paths = [...src.matchAll(/\['(\/[^']*)'/g)].map(m => m[1])
  const module = workspace === 'lvyuan' ? 'CN-SSE' : 'GRI'
  return paths.map(p => p.replace(':moduleId', module).replace(':periodId', workspace === 'lvyuan' ? 'FY2026' : 'FY2025'))
}

type Session = { locale?: 'zh' | 'en'; workspace?: 'lvyuan' | 'aeiforo'; onboarded?: boolean; email?: string }

/** Start signed in as a seeded member (the demo administrator by default), skipping the login screen. */
export async function signIn(page: Page, { locale = 'zh', workspace = 'lvyuan', onboarded = true, email = DEMO.email }: Session = {}) {
  await page.addInitScript(
    ([l, w, o, e]) => {
      if (sessionStorage.getItem('e2e-seeded')) return
      sessionStorage.setItem('e2e-seeded', '1')
      localStorage.setItem('aeiforo_auth_user', JSON.stringify({ email: e }))
      localStorage.setItem('aeiforo_language', l)
      localStorage.setItem('aeiforo_workspace', w)
      if (o)
        localStorage.setItem(
          'nexus.preferences',
          JSON.stringify({
            state: { persona: 'preparer', textSize: 'standard', overviewMode: 'detailed', onboarded: true, owner: e, saved: {} },
            version: 1,
          }),
        )
    },
    [locale, workspace, onboarded, email] as const,
  )
}

/** Fails the test on any console error or uncaught exception. */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = []
    page.on('console', m => m.type() === 'error' && errors.push(m.text()))
    page.on('pageerror', e => errors.push(e.message))
    await use(errors)
    expect(errors, 'console errors').toEqual([])
  },
})

export { expect }
