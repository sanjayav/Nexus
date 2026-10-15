import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import type { QuestionAssignment } from '../../lib/orgStore'
import FocusCard from '../../components/mytasks/FocusCard'

function makeAssignment(over: Partial<QuestionAssignment> = {}): QuestionAssignment {
  return {
    id: over.id ?? 'a1',
    framework_id: 'gri',
    questionId: 'q-305-1',
    gri_code: '305-1',
    line_item: 'Direct (Scope 1) GHG emissions',
    entityId: 'e1',
    assigneeId: 'u1',
    assigneeName: 'Me',
    assigneeEmail: 'me@aeiforo.com',
    entry_modes: ['Manual'],
    due_date: null,
    assigned_by: 'u-admin',
    assigned_at: new Date().toISOString(),
    status: 'not_started',
    ...over,
  }
}

function renderInRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('<FocusCard />', () => {
  it('shows the calm congratulation card when no focus task', () => {
    renderInRouter(<FocusCard focus={null} totalApproved={5} onSkip={vi.fn()} onSeeApproved={vi.fn()} />)
    expect(screen.getByText(/caught up/i)).toBeInTheDocument()
    expect(screen.getByText(/5/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /approved history/i })).toBeInTheDocument()
  })

  it('renders the gri_code, framework chip and line item when a focus exists', () => {
    const a = makeAssignment({ due_date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10) })
    renderInRouter(<FocusCard focus={a} totalApproved={0} onSkip={vi.fn()} onSeeApproved={vi.fn()} />)
    expect(screen.getByText('305-1')).toBeInTheDocument()
    expect(screen.getByText(/Direct \(Scope 1\)/)).toBeInTheDocument()
    expect(screen.getByText(/Due in 2 days|Due tomorrow|Due today/)).toBeInTheDocument()
  })

  it('shows "Overdue" label when due_date is in the past', () => {
    const a = makeAssignment({ due_date: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10) })
    renderInRouter(<FocusCard focus={a} totalApproved={0} onSkip={vi.fn()} onSeeApproved={vi.fn()} />)
    expect(screen.getByText(/Overdue/)).toBeInTheDocument()
  })

  it('fires onSkip when the skip button is clicked', () => {
    const onSkip = vi.fn()
    const a = makeAssignment()
    renderInRouter(<FocusCard focus={a} totalApproved={0} onSkip={onSkip} onSeeApproved={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(onSkip).toHaveBeenCalledOnce()
  })
})
