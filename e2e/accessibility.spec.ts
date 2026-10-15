import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const PUBLIC_PAGES = ['/login', '/forgot-password']

for (const path of PUBLIC_PAGES) {
  test(`${path} has no critical/serious a11y violations`, async ({ page }) => {
    await page.goto(path)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    const blocking = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')
    if (blocking.length > 0) {
      console.log(JSON.stringify(blocking.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length })), null, 2))
    }
    expect(blocking, blocking.map(v => `${v.id} (${v.impact})`).join(', ')).toEqual([])
  })
}
