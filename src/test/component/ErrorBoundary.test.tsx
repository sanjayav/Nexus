import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import ErrorBoundary from '../../components/ErrorBoundary'

function BoomComponent({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) throw new Error('kaboom')
  return <div>safe-child</div>
}

describe('<ErrorBoundary />', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <BoomComponent shouldThrow={false} />
      </ErrorBoundary>
    )
    expect(screen.getByText('safe-child')).toBeInTheDocument()
  })

  it('renders fallback UI when a child throws', () => {
    // Silence console.error from React's error logging during the throw.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <BoomComponent />
      </ErrorBoundary>
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    expect(screen.getByText('kaboom')).toBeInTheDocument()
    spy.mockRestore()
  })

  it('"Try again" button resets the boundary', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    // Use a counter ref so the second render after reset can succeed.
    let throws = true
    function Conditional() {
      if (throws) throw new Error('first-failure')
      return <div>recovered</div>
    }
    const { rerender } = render(
      <ErrorBoundary>
        <Conditional />
      </ErrorBoundary>
    )
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    throws = false
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    rerender(
      <ErrorBoundary>
        <Conditional />
      </ErrorBoundary>
    )
    expect(screen.getByText('recovered')).toBeInTheDocument()
    spy.mockRestore()
  })
})
