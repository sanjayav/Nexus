import '../../i18n'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import type { QuestionAssignment, OrgEntity, OrgMember } from '../../lib/orgStore'
import DateGroupedList from '../../components/mytasks/DateGroupedList'

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u-me', email: 'me@aeiforo.com', name: 'Me' } }),
}))

function mkAssignment(over: Partial<QuestionAssignment>): QuestionAssignment {
  return {
    id: over.id!,
    framework_id: 'gri',
    questionId: over.questionId ?? 'q1',
    gri_code: over.gri_code ?? '305-1',
    line_item: over.line_item ?? 'Scope 1 emissions',
    entityId: 'e1',
    assigneeId: 'u1',
    assigneeName: 'Me',
    assigneeEmail: 'me@aeiforo.com',
    entry_modes: ['Manual'],
    due_date: over.due_date ?? null,
    assigned_by: 'admin',
    assigned_at: new Date().toISOString(),
    status: over.status ?? 'not_started',
    ...over,
  }
}

function iso(daysFromNow: number): string {
  const d = new Date(Date.now() + daysFromNow * 86400000)
  return d.toISOString().slice(0, 10)
}

describe('<DateGroupedList />', () => {
  const entities: OrgEntity[] = [
    { id: 'e1', parentId: null, type: 'group', name: 'HQ', createdAt: '' },
  ]
  const members: OrgMember[] = []
  const questionById = new Map()
  const entityById = new Map(entities.map(e => [e.id, e]))

  function renderWith(assignments: QuestionAssignment[]) {
    return render(
      <MemoryRouter>
        <DateGroupedList
          assignments={assignments}
          questionById={questionById}
          entityById={entityById}
          entities={entities}
          members={members}
          expandedId={null}
          focusedId={null}
          onToggle={() => {}}
          onUpdate={() => {}}
        />
      </MemoryRouter>
    )
  }

  it('groups tasks into the correct deadline buckets', () => {
    const tasks = [
      mkAssignment({ id: 'a-overdue',  due_date: iso(-2) }),
      mkAssignment({ id: 'a-today',    due_date: iso(0)  }),
      mkAssignment({ id: 'a-week',     due_date: iso(3)  }),
      mkAssignment({ id: 'a-month',    due_date: iso(15) }),
      mkAssignment({ id: 'a-later',    due_date: iso(60) }),
      mkAssignment({ id: 'a-none',     due_date: null    }),
    ]
    renderWith(tasks)
    expect(screen.getByRole('heading', { name: 'Overdue' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Due today' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'This week' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'This month' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Later' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'No deadline' })).toBeInTheDocument()
  })

  it('hides empty groups', () => {
    const tasks = [mkAssignment({ id: 'a-1', due_date: iso(2) })]
    renderWith(tasks)
    expect(screen.getByRole('heading', { name: 'This week' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Overdue' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Later' })).not.toBeInTheDocument()
  })

  it('puts submitted and approved work in their own groups, with Approved collapsed', () => {
    const tasks = [
      mkAssignment({ id: 'a-sub', due_date: iso(0), status: 'submitted' }),
      mkAssignment({ id: 'a-ok', due_date: iso(1), status: 'approved', line_item: 'Approved item' }),
      mkAssignment({ id: 'a-back', due_date: iso(5), status: 'rejected' }),
    ]
    renderWith(tasks)
    expect(screen.queryByRole('heading', { name: 'Due today' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Submitted · awaiting review' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sent back to you' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Approved' })).toBeInTheDocument()
    expect(screen.queryByText('Approved item')).not.toBeInTheDocument()
  })

  it('renders empty when assignments list is empty', () => {
    const { container } = renderWith([])
    expect(container.querySelector('section')).toBeNull()
  })
})
