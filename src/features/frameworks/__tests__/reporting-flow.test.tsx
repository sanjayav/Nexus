// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderPage, slice } from '@/test/render'
import QuestionnairePage from '@/features/frameworks/QuestionnairePage'
import ModuleReviewPage from '@/features/frameworks/ModuleReviewPage'
import { useReportingStore } from '@/store/reporting'

const routes = [
  { path: '/modules/:moduleId/questionnaire', element: <QuestionnairePage /> },
  { path: '/modules/:moduleId/review', element: <ModuleReviewPage /> },
]

describe('data entry → submit', () => {
  it('blocks submission until required answers exist, then submits for review', async () => {
    const user = userEvent.setup()
    renderPage('/modules/CN-SSE/questionnaire', routes)

    // Section 8 (科技伦理) has one required answer missing in the seed.
    await user.click(await screen.findByRole('button', { name: /创新驱动与科技伦理/ }))
    const submit = await screen.findByRole('button', { name: '提交审核' })
    expect(submit).toBeDisabled()

    const field = document.getElementById('f-sse_tech_ethics') as HTMLTextAreaElement
    await user.type(field, '设立科技伦理审查委员会，按季度审查 AI 质检与 BMS 算法。')
    fireEvent.blur(field)

    await waitFor(() => expect(slice().sections['CNSSE-INNOV'].answers.sse_tech_ethics).toMatch(/科技伦理审查委员会/))
    expect(slice().sections['CNSSE-INNOV'].status).toBe('draft')

    await waitFor(() => expect(screen.getByRole('button', { name: '提交审核' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: '提交审核' }))

    expect(slice().sections['CNSSE-INNOV'].status).toBe('submitted')
    expect(slice().notifications[0]).toMatchObject({ kind: 'submit', sectionId: 'CNSSE-INNOV', route: '/modules/CN-SSE/review' })
  })

  it('locks approved sections until reopened', async () => {
    const user = userEvent.setup()
    renderPage('/modules/CN-SSE/questionnaire', routes)
    // Section 1 is approved in the seed.
    const field = (await waitFor(() => document.getElementById('f-sse_report_scope'))) as HTMLTextAreaElement
    expect(field).toHaveAttribute('readonly')
    await user.click(screen.getByRole('button', { name: '重新打开编辑' }))
    expect(slice().sections['CNSSE-GEN'].status).toBe('draft')
    await waitFor(() => expect(document.getElementById('f-sse_report_scope')).not.toHaveAttribute('readonly'))
  })
})

describe('review → decision', () => {
  it('approves a submitted section and records the decision', async () => {
    const user = userEvent.setup()
    renderPage('/modules/CN-SSE/review', routes)
    const queue = await screen.findAllByRole('button', { name: '审核通过' })
    expect(queue.length).toBeGreaterThanOrEqual(2)
    await user.click(queue[0])
    const approved = Object.entries(slice().sections).filter(([, v]) => v.status === 'approved')
    expect(approved).toHaveLength(1)
    expect(slice().activity[0]).toMatchObject({ kind: 'approve', actor: '王敏' })
  })

  it('requires a note to request changes and shows it to the preparer', async () => {
    const user = userEvent.setup()
    renderPage('/modules/CN-SSE/review', routes)
    await user.click((await screen.findAllByRole('button', { name: '退回修改' }))[0])
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: '发送' }))
    expect(within(dialog).getByText('请填写修改意见。')).toBeInTheDocument()
    await user.type(within(dialog).getByRole('textbox'), '请补充风险矩阵口径说明')
    await user.click(within(dialog).getByRole('button', { name: '发送' }))

    const returned = Object.entries(slice().sections).find(([, v]) => v.status === 'changes_requested')
    expect(returned).toBeDefined()
    expect(slice().activity[0]).toMatchObject({ kind: 'request_changes', note: '请补充风险矩阵口径说明' })
  })

  it('bulk-approves selected sections', async () => {
    const user = userEvent.setup()
    renderPage('/modules/CN-SSE/review', routes)
    for (const box of await screen.findAllByRole('checkbox')) await user.click(box)
    await user.click(await screen.findByRole('button', { name: /批量通过 2 项/ }))
    expect(Object.values(slice().sections).filter(v => v.status === 'approved')).toHaveLength(2)
  })
})

describe('comments and mentions', () => {
  it('suggests colleagues after @ and notifies on mention', async () => {
    const user = userEvent.setup()
    renderPage('/modules/CN-SSE/questionnaire', routes)
    await user.click(await screen.findByRole('button', { name: /创新驱动与科技伦理/ }))
    await waitFor(() => expect(document.getElementById('f-sse_report_scope')).toBeNull())
    await user.click((await screen.findAllByRole('button', { name: /添加评论/ }))[0])
    const box = await screen.findByRole('textbox', { name: '评论' })
    await user.type(box, '@李')
    await user.click(await screen.findByRole('button', { name: /李娜/ }))
    expect(box).toHaveValue('@李娜 ')
    await user.type(box, '请复核研发投入口径')
    await user.click(screen.getByRole('button', { name: '发表' }))
    expect(slice().comments[0]).toMatchObject({ body: '@李娜 请复核研发投入口径', sectionId: 'CNSSE-INNOV' })
    expect(slice().notifications[0].kind).toBe('comment')
  })
})

describe('workspace isolation', () => {
  it('global tenant starts with an empty slice and English UI', async () => {
    renderPage('/modules/GRI/questionnaire', routes, { locale: 'en', workspace: 'aeiforo' })
    expect(await screen.findByRole('button', { name: 'Import from Excel' })).toBeInTheDocument()
    act(() => useReportingStore.getState().resetWorkspace('aeiforo'))
    expect(slice('aeiforo')).toBeUndefined()
  })
})
