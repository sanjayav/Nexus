import { test, expect } from '@playwright/test'

const PUBLIC = ['/login', '/forgot-password']

for (const path of PUBLIC) {
  test(`${path} loads without console errors`, async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    expect(errors, errors.join('\n')).toEqual([])
  })
}
