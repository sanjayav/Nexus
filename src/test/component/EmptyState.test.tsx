import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import EmptyState from '../../components/EmptyState'

describe('<EmptyState />', () => {
  it('renders the title and body', () => {
    render(<EmptyState title="Nothing here" body="Try again later." />)
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
    expect(screen.getByText('Try again later.')).toBeInTheDocument()
  })

  it('fires the CTA callback when clicked', () => {
    const onClick = vi.fn()
    render(<EmptyState title="No items" cta={{ label: 'Create one', onClick }} />)
    fireEvent.click(screen.getByText('Create one'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('renders as a status region for assistive tech', () => {
    render(<EmptyState title="Empty bin" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders the illustration when provided in place of the icon medallion', () => {
    function TestIllustration({ className = '' }: { className?: string }) {
      return <svg data-testid="test-illustration" className={className} />
    }
    render(<EmptyState title="No data" illustration={TestIllustration} />)
    expect(screen.getByTestId('test-illustration')).toBeInTheDocument()
  })
})
