import { test, expect, signIn, appPaths } from './fixtures'

/** Every page, in both languages, both tenants: renders, no console errors, no sideways scrolling. */
for (const [locale, workspace] of [
  ['zh', 'lvyuan'],
  ['en', 'aeiforo'],
] as const) {
  test.describe(`${locale} · ${workspace}`, () => {
    for (const path of appPaths(workspace)) {
      test(`renders ${path}`, async ({ page, consoleErrors: _ }) => {
        await signIn(page, { locale, workspace, name: locale === 'zh' ? '王敏' : 'Sarah Lee' })
        await page.goto(path)
        await expect(page.locator('main h1, main h2').first()).toBeVisible()
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        expect(overflow, 'horizontal overflow (px)').toBeLessThanOrEqual(1)
        if (locale === 'zh') {
          // No untranslated English sentence in the sidebar/topbar chrome.
          await expect(page.locator('aside nav').first()).not.toContainText('Command Center')
        }
      })
    }
  })
}
