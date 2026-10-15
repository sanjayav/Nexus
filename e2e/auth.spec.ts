import { test, expect } from '@playwright/test'

test.describe('auth', () => {
  test('login page renders with all key elements', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    // Forgot password link
    await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible()
    // SSO button (may be disabled if WorkOS not configured)
    await expect(page.getByRole('button', { name: /sso/i })).toBeVisible()
  })

  test('invalid credentials show error', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('nobody@example.com')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 })
  })

  test('switching to register mode shows workspace + name fields', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /need an account|create one/i }).click()
    await expect(page.getByLabel(/full name/i)).toBeVisible()
    await expect(page.getByLabel(/workspace/i)).toBeVisible()
  })

  test('forgot password page accepts email and shows confirmation', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.getByLabel(/email/i).fill('test@example.com')
    await page.getByRole('button', { name: /send|reset/i }).click()
    await expect(page.locator('text=/we.?ve sent|check your|if an account exists/i')).toBeVisible({ timeout: 5000 })
  })

  test('quick demo tile login works (skipped if VITE_DEMO_PASSWORD not set)', async ({ page }) => {
    test.skip(!process.env.E2E_DEMO_PASSWORD, 'No demo password configured')
    await page.goto('/login')
    const tile = page.getByRole('button', { name: /quick sign-in as platform admin/i })
    if (await tile.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tile.click()
      await expect(page).toHaveURL(/\/(dashboard|home|$)/, { timeout: 10_000 })
    } else {
      test.skip()
    }
  })
})
