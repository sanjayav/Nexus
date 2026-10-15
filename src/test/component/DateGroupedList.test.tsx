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
    expect(screen.getByText('Overdue')).toBeInTheDocument()
    expect(screen.getByText('Due today')).toBeInTheDocument()
    expect(screen.getByText('This week')).toBeInTheDocument()
    expect(screen.getByText('This month')).toBeInTheDocument()
    expect(screen.getByText('Later')).toBeInTheDocument()
    expect(screen.getByText('No deadline')).toBeInTheDocument()
  })

  it('hides empty groups', () => {
    const tasks = [mkAssignment({ id: 'a-1', due_date: iso(2) })]
    renderWith(tasks)
    expect(screen.getByText('This week')).toBeInTheDocument()
    expect(screen.queryByText('Overdue')).not.toBeInTheDocument()
    expect(screen.queryByText('Later')).not.toBeInTheDocument()
  })

  it('renders empty when assignments list is empty', () => {
    const { container } = renderWith([])
    expect(container.querySelector('section')).toBeNull()
  })
})
