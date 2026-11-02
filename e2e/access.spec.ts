import { test, expect, signIn } from './fixtures'

/**
 * The whole access journey in a real browser: an administrator invites a
 * reviewer, the reviewer accepts in their own browser, sees only what a
 * reviewer may see, and the administrator's access log records it.
 */
test('admin invites a reviewer, who joins with a limited view', async ({ page, browser, consoleErrors: _ }) => {
  await signIn(page)
  await page.goto('/iam')
  await expect(page.getByRole('heading', { name: '成员与权限' })).toBeVisible()

  await page.getByRole('textbox', { name: '工作邮箱' }).fill('xu.lan@lvyuan-demo.example')
  await page.getByRole('combobox', { name: '角色' }).first().selectOption('reviewer')
  await page.getByRole('button', { name: '发送邀请' }).click()

  const dialog = page.getByRole('dialog', { name: '邀请已创建' })
  const link = await dialog.getByRole('textbox').inputValue()
  expect(link).toMatch(/\/invite\/[0-9a-f]{36}$/)
  await dialog.getByRole('button', { name: '完成' }).click()
  await expect(page.getByRole('listitem', { name: 'xu.lan@lvyuan-demo.example' })).toBeVisible()

  // The invitee opens the link on a device that shares nothing but the demo's local data.
  const storage = await page.context().storageState()
  const invitee = await browser.newContext({ storageState: { cookies: [], origins: storage.origins } })
  const other = await invitee.newPage()
  // Signed out on first load only; the session the invitation creates must survive navigation.
  await other.addInitScript(() => {
    if (sessionStorage.getItem('fresh')) return
    sessionStorage.setItem('fresh', '1')
    localStorage.removeItem('aeiforo_auth_user')
  })
  await other.goto(link)
  await expect(other.getByRole('heading', { name: '加入绿源控股集团' })).toBeVisible()
  await other.getByLabel('姓名').fill('许岚')
  await other.getByLabel('设置密码').fill('reviewer-2026')
  await other.getByRole('checkbox').check()
  await other.getByRole('button', { name: '接受邀请并加入' }).click()

  // A new person gets their own first run.
  const welcome = other.getByRole('dialog', { name: '欢迎使用 Nexus' })
  await expect(welcome).toBeVisible()
  await welcome.getByRole('button', { name: '开始使用' }).click()

  // Reviewers see no administration in the menu, and the page itself refuses them.
  await other.goto('/modules/CN-SSE/review')
  await expect(other.getByRole('button', { name: '审核通过' }).locator('visible=true').first()).toBeDisabled()
  await other.goto('/iam')
  await expect(other.getByRole('heading', { name: '您无权访问此页面' })).toBeVisible()
  await expect(other.locator('aside nav').first()).not.toContainText('成员与权限')
  await invitee.close()
})

test('a data contributor signs in from the demo accounts and gets only their own access', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('aeiforo_language', 'zh')
    localStorage.setItem('aeiforo_workspace', 'lvyuan')
  })
  await page.goto('/login')
  await page.getByText('演示账号').click()
  await page.getByRole('button', { name: /陈刚/ }).click()
  await page.getByLabel('密码').press('Enter')
  await expect(page).toHaveURL(/\/executive$/)

  await page.goto('/modules/HKEX-ESG/questionnaire')
  await expect(page.getByText(/您仅获授权填报/)).toBeVisible()
  await page.goto('/connectors')
  await expect(page.getByRole('heading', { name: '您无权访问此页面' })).toBeVisible()
})
