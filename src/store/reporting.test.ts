import { beforeEach, describe, expect, it } from 'vitest'
import { seedStatus, useReportingStore } from './reporting'
import { buildSectionView, summarize } from './hooks'

const ctx = { ws: 'lvyuan', actor: '王敏' }
const section = {
  id: 'S1',
  title: 'Section',
  module: 'CN-SSE',
  material: true,
  fields: [
    { id: 'a', label: 'A', type: 'text', value: '', required: true },
    { id: 'b', label: 'B', type: 'text', value: 'seeded', required: true },
  ],
  meta: { status: 'Draft' },
} as unknown as Parameters<typeof buildSectionView>[0]

describe('reporting store', () => {
  beforeEach(() => useReportingStore.setState({ workspaces: {} }))

  it('maps seed statuses', () => {
    expect(seedStatus('Approved')).toBe('approved')
    expect(seedStatus('In Review')).toBe('submitted')
    expect(seedStatus(undefined, false)).toBe('not_started')
  })

  it('overlays answers on seed values and tracks completion', () => {
    useReportingStore.getState().setAnswer(ctx, 'CN-SSE', 'S1', 'a', '42')
    const view = buildSectionView(section, useReportingStore.getState().workspaces.lvyuan)
    expect(view.values).toEqual({ a: '42', b: 'seeded' })
    expect(view.answered).toBe(2)
    expect(view.status).toBe('draft')
  })

  it('collapses consecutive edits to one field into one activity entry', () => {
    const { setAnswer } = useReportingStore.getState()
    setAnswer(ctx, 'CN-SSE', 'S1', 'a', '4')
    setAnswer(ctx, 'CN-SSE', 'S1', 'a', '42')
    expect(useReportingStore.getState().workspaces.lvyuan.activity).toHaveLength(1)
  })

  it('runs submit → request changes → approve with notifications', () => {
    const s = useReportingStore.getState()
    s.submitSection(ctx, 'CN-SSE', 'S1')
    s.decide(ctx, 'CN-SSE', ['S1'], 'request_changes', '请补充口径说明')
    let slice = useReportingStore.getState().workspaces.lvyuan
    expect(slice.sections.S1.status).toBe('changes_requested')
    s.decide(ctx, 'CN-SSE', ['S1'], 'approve')
    slice = useReportingStore.getState().workspaces.lvyuan
    expect(slice.sections.S1.status).toBe('approved')
    expect(slice.notifications.map(n => n.kind)).toEqual(['approve', 'request_changes', 'submit'])
    expect(summarize([buildSectionView(section, slice)]).approved).toBe(1)
  })

  it('keeps workspaces isolated and resettable', () => {
    const s = useReportingStore.getState()
    s.importAnswers(ctx, 'CN-SSE', { S1: { a: '1', b: '2' } }, 'data.xlsx')
    s.importAnswers({ ws: 'aeiforo', actor: 'Sam' }, 'GRI', { X: { y: '3' } }, 'data.csv')
    expect(useReportingStore.getState().workspaces.lvyuan.activity[0]).toMatchObject({ kind: 'import', count: 2 })
    s.resetWorkspace('lvyuan')
    expect(useReportingStore.getState().workspaces.lvyuan).toBeUndefined()
    expect(useReportingStore.getState().workspaces.aeiforo).toBeDefined()
  })

  it('notifies only on comments that @mention someone', () => {
    const s = useReportingStore.getState()
    s.addComment(ctx, 'CN-SSE', 'S1', '数据已核对')
    s.addComment(ctx, 'CN-SSE', 'S1', '@李娜 请复核')
    expect(useReportingStore.getState().workspaces.lvyuan.notifications).toHaveLength(1)
  })

  it('stores and clears comply-or-explain notes', () => {
    const s = useReportingStore.getState()
    s.setExplanation(ctx, 'S1', '  本公司不涉及该业务  ')
    expect(useReportingStore.getState().workspaces.lvyuan.explanations).toEqual({ S1: '本公司不涉及该业务' })
    s.setExplanation(ctx, 'S1', '')
    expect(useReportingStore.getState().workspaces.lvyuan.explanations).toEqual({})
  })

  it('turns import notes into field comments', () => {
    useReportingStore
      .getState()
      .importAnswers(ctx, 'CN-SSE', { S1: { a: '42' } }, 'data.xlsx', [
        { sectionId: 'S1', fieldId: 'a', body: '来源：2026 年 9 月电费账单' },
      ])
    const slice = useReportingStore.getState().workspaces.lvyuan
    expect(slice.comments).toMatchObject([{ sectionId: 'S1', fieldId: 'a', body: '来源：2026 年 9 月电费账单', author: '王敏' }])
    expect(slice.sections.S1.answers.a).toBe('42')
  })
})
