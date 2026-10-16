import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import StateBoundary from '../../components/ui/StateBoundary'
import StatusPill from '../../components/ui/StatusPill'
import ConfirmSheet from '../../components/ui/ConfirmSheet'
import StatLedger from '../../components/ui/StatLedger'

describe('<StateBoundary />', () => {
  it('never claims "empty" while an error is present', () => {
    render(
      <StateBoundary loading={false} error={new Error('500')} empty onRetry={() => {}} emptyState={{ variant: 'cleared' }}>
        <div>rows</div>
      </StateBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText(/all clear/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('shows a loading status, not the empty state, while loading', () => {
    render(
      <StateBoundary loading empty emptyState={{ variant: 'cleared' }}>
        <div>rows</div>
      </StateBoundary>,
    )
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText(/all clear/i)).not.toBeInTheDocument()
  })

  it('renders children once data is present', () => {
    render(<StateBoundary loading={false}>{() => <div>rows</div>}</StateBoundary>)
    expect(screen.getByText('rows')).toBeInTheDocument()
  })
})

describe('<StatusPill />', () => {
  it('translates canonical statuses and sets a tone', () => {
    render(<StatusPill status="submitted" />)
    const pill = screen.getByText('Submitted').parentElement!
    expect(pill).toHaveAttribute('data-tone', 'info')
  })
})

describe('<ConfirmSheet />', () => {
  it('confirms, cancels on Escape, and focuses Cancel for destructive actions', async () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <ConfirmSheet open onOpenChange={onOpenChange} onConfirm={onConfirm} title="Delete period?" tone="destructive" confirmLabel="Delete" />,
    )
    expect(screen.getByRole('alertdialog', { name: 'Delete period?' })).toBeInTheDocument()
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))) })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' })
    expect(onOpenChange).toHaveBeenCalledWith(false)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('requires the typed text before enabling a destructive confirm', () => {
    render(<ConfirmSheet open onOpenChange={() => {}} onConfirm={() => {}} title="Remove entity" tone="destructive" confirmLabel="Remove" requireText="Shanghai Plant" />)
    const btn = screen.getByRole('button', { name: 'Remove' })
    expect(btn).toBeDisabled()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Shanghai Plant' } })
    expect(btn).not.toBeDisabled()
  })
})

describe('<StatLedger />', () => {
  it('renders labels, string values and links', () => {
    render(
      <MemoryRouter>
        <StatLedger items={[{ id: 'a', label: 'Open', value: 17, to: '/my-tasks' }, { id: 'b', label: 'Hash chain', value: 'Verified', tone: 'success' }]} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.getByText('Verified')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/my-tasks')
    expect(screen.getByLabelText('17')).toBeInTheDocument()
  })
})
