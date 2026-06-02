import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react'
import { vi } from 'vitest'
import { orgStore, type AssignmentComment, type OrgMember } from '../../lib/orgStore'

// AuthContext gives us `user.id` + `user.email` used by the rail.
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u-me', email: 'me@aeiforo.com', name: 'Me' },
  }),
}))

import CommentThread from '../../components/CommentThread'

function makeComment(overrides: Partial<AssignmentComment> = {}): AssignmentComment {
  return {
    id: overrides.id ?? 'c1',
    assignment_id: 'a1',
    author_user_id: 'u-author',
    author_name: 'Sam Author',
    author_email: 'sam@aeiforo.com',
    body: 'Looks good',
    kind: 'comment',
    parent_comment_id: null,
    mentioned_user_ids: null,
    is_request_for_review: null,
    resolved_at: null,
    resolved_by: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

const MEMBERS: OrgMember[] = [
  { id: 'm1', userId: 'u-jane', entityId: 'e1', email: 'jane@aeiforo.com', name: 'Jane Doe', role: 'group_sustainability_officer', createdAt: '' },
  { id: 'm2', userId: 'u-bob',  entityId: 'e1', email: 'bob@aeiforo.com',  name: 'Bob Stone', role: 'subsidiary_lead',             createdAt: '' },
]

describe('<CommentThread />', () => {
  beforeEach(() => {
    vi.spyOn(orgStore, 'listMembers').mockResolvedValue(MEMBERS)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders a thread with a parent and an indented reply', async () => {
    vi.spyOn(orgStore, 'listComments').mockResolvedValue([
      makeComment({ id: 'p1', body: 'Parent comment' }),
      makeComment({ id: 'r1', parent_comment_id: 'p1', author_name: 'Other', body: 'Threaded reply text' }),
    ])
    render(<CommentThread assignmentId="a1" />)

    await screen.findByText('Parent comment')
    // The reply renders nested under its parent, not as a top-level item.
    expect(screen.getByText('Threaded reply text')).toBeInTheDocument()
    // Only one Reply button (on the parent) — the reply itself has none.
    expect(screen.getAllByRole('button', { name: /^Reply$/ }).length).toBe(1)
  })

  it('shows the @mention autocomplete when typing @', async () => {
    vi.spyOn(orgStore, 'listComments').mockResolvedValue([])
    render(<CommentThread assignmentId="a1" />)

    await waitFor(() => expect(orgStore.listMembers).toHaveBeenCalled())
    const textarea = await screen.findByLabelText(/Write a comment/i)
    // Type "@" — the suggestion list should appear.
    fireEvent.change(textarea, { target: { value: 'Hey @' } })
    const list = await screen.findByRole('listbox', { name: /Mention suggestions/i })
    expect(within(list).getByText('Jane Doe')).toBeInTheDocument()
    expect(within(list).getByText('Bob Stone')).toBeInTheDocument()
  })

  it('toggles resolve → reopen on a comment', async () => {
    const initial = [makeComment({ id: 'p1', author_email: 'me@aeiforo.com', body: 'Mine' })]
    const list = vi.spyOn(orgStore, 'listComments').mockResolvedValue(initial)
    const resolve = vi.spyOn(orgStore, 'resolveComment').mockResolvedValue()

    render(<CommentThread assignmentId="a1" />)
    await screen.findByText('Mine')

    // After resolve the next listComments call returns a resolved row, which
    // re-renders the comment as a one-liner.
    list.mockResolvedValueOnce([{ ...initial[0], resolved_at: new Date().toISOString(), resolved_by: 'u-me' }])

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Resolve/i }))
    })
    await waitFor(() => expect(resolve).toHaveBeenCalledWith('p1'))
  })
})
