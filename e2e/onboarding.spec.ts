import { test, expect, DEMO } from './fixtures'

test.describe('sign-in and first run', () => {
  test('an executive signs in, picks their role and large text, and lands on the plain summary', async ({ page, consoleErrors: _ }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('seeded')) {
        sessionStorage.setItem('seeded', '1')
        localStorage.setItem('aeiforo_language', 'zh')
        localStorage.setItem('aeiforo_workspace', 'lvyuan')
      }
    })
    await page.goto('/login')
    await page.getByLabel('工作邮箱').fill(DEMO.email)
    await page.getByLabel('密码').fill(DEMO.password)
    await page.getByLabel('密码').press('Enter')

    const welcome = page.getByRole('dialog', { name: '欢迎使用 Nexus' })
    await expect(welcome).toBeVisible()
    await welcome.getByRole('radio', { name: /我负责管理与决策/ }).click()
    await welcome.getByLabel('使用大字号').check()
    await welcome.getByRole('button', { name: '开始使用' }).click()

    await expect(page).toHaveURL(/\/executive$/)
    await expect(page.getByRole('tab', { name: '管理层摘要', selected: true })).toBeVisible()
    await expect(page.getByText(/年度可持续发展报告/).first()).toBeVisible()
    expect(await page.evaluate(() => document.body.style.zoom)).toBe('1.15')

    // Preferences survive a reload; the welcome does not come back.
    await page.reload()
    await expect(page.getByRole('tab', { name: '管理层摘要', selected: true })).toBeVisible()
    await expect(welcome).toBeHidden()
  })

  test('wrong password shows a clear error and no access', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/Work email|工作邮箱/).fill(DEMO.email)
    await page.getByLabel(/Password|密码/).fill('wrong')
    await page.getByLabel(/Password|密码/).press('Enter')
    await expect(page.getByText(/That email and password don’t match|邮箱或密码不正确/)).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })
})
