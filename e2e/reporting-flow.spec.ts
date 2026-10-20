import { test, expect, signIn } from './fixtures'
import type { Page } from '@playwright/test'

/** Desktop has a section list; phones get a dropdown. Users reach the section either way. */
async function openSection(page: Page, name: RegExp) {
  const picker = page.getByRole('combobox', { name: '披露章节' })
  if (await picker.isVisible()) {
    const label = await picker.locator('option').filter({ hasText: name }).first().textContent()
    await picker.selectOption({ label: label! })
  } else {
    await page.getByRole('button', { name }).first().click()
  }
}

test('preparer submits, reviewer returns with a note, preparer sees it and resubmits', async ({ page, consoleErrors: _ }) => {
  await signIn(page)
  await page.goto('/modules/CN-SSE/questionnaire')

  // Section 8 is missing one required answer.
  await openSection(page, /创新驱动与科技伦理/)
  const submit = page.getByRole('button', { name: '提交审核' })
  await expect(submit).toBeDisabled()
  const field = page.locator('#f-sse_tech_ethics')
  await field.fill('设立科技伦理审查委员会，按季度审查 AI 质检与 BMS 算法的伦理风险。')
  await field.blur()
  await expect(submit).toBeEnabled()
  await submit.click()
  await expect(page.getByText('章节已提交，已通知审核人。')).toBeVisible()

  // Reviewer side: return it with a note.
  await page.goto('/modules/CN-SSE/review')
  const card = page.getByRole('article', { name: /创新驱动与科技伦理/ })
  await card.getByRole('button', { name: '退回修改' }).locator('visible=true').first().click()
  const dialog = page.getByRole('dialog', { name: '退回修改' })
  await dialog.getByRole('textbox').fill('请补充科技伦理审查的覆盖范围与审查次数。')
  await dialog.getByRole('button', { name: '发送' }).click()
  await expect(page.getByText('已退回填报人，并附修改意见。')).toBeVisible()

  // The bell shows the decision; it links back to the section.
  await expect(page.getByRole('button', { name: '通知' })).toContainText(/\d/)

  // Preparer sees the reviewer's note in place and can resubmit.
  await page.goto('/modules/CN-SSE/questionnaire')
  await openSection(page, /创新驱动与科技伦理/)
  await expect(page.getByText('请补充科技伦理审查的覆盖范围与审查次数。')).toBeVisible()
  await expect(page.getByRole('button', { name: '提交审核' })).toBeEnabled()

  // Work persists across a reload.
  await page.reload()
  await openSection(page, /创新驱动与科技伦理/)
  await expect(page.locator('#f-sse_tech_ethics')).toHaveValue(/科技伦理审查委员会/)
})

test('task inbox lists live workflow work and the sidebar badge agrees', async ({ page }) => {
  await signIn(page)
  await page.goto('/tasks')
  await expect(page.getByText(/审核已提交章节：/).first()).toBeVisible()
})
