import { test, expect } from '@playwright/test'

test.describe('happy path', () => {
  test.skip(({ }, _testInfo) => !process.env.E2E_DEMO_PASSWORD, 'No demo password — skipping live E2E')

  test('sign in → see dashboard → open my tasks → open materiality', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('admin@aeiforo.com')
    await page.getByLabel(/password/i).fill(process.env.E2E_DEMO_PASSWORD!)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/(dashboard|home|$)/, { timeout: 15_000 })
    await expect(page.locator('main')).toBeVisible()

    await page.goto('/my-tasks')
    await expect(page.locator('main')).toBeVisible()

    await page.goto('/admin/materiality')
    await expect(page.locator('main')).toBeVisible()
  })
})
