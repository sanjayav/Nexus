import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import ProductTour from '../../components/ProductTour'

/**
 * ProductTour persistence is pure client state — no MSW. localStorage is
 * reset between tests by the global setup, but we double-tap here.
 */
describe('<ProductTour />', () => {
  const userId = 'tour-user-1'
  const storageKey = `aeiforo_tour_completed_${userId}`

  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the welcome step on first run', () => {
    render(<ProductTour userId={userId} />)
    expect(screen.getByText('Welcome to Nexus')).toBeInTheDocument()
    // Step counter starts at 1/4 by default.
    expect(screen.getByText('1 / 4')).toBeInTheDocument()
  })

  it('does NOT render once the completion key is set', () => {
    localStorage.setItem(storageKey, '1')
    render(<ProductTour userId={userId} />)
    expect(screen.queryByText('Welcome to Nexus')).not.toBeInTheDocument()
  })

  it('clicking Skip marks the completion key in localStorage', () => {
    render(<ProductTour userId={userId} />)
    fireEvent.click(screen.getByText('Skip tour'))
    expect(localStorage.getItem(storageKey)).toBe('1')
    expect(screen.queryByText('Welcome to Nexus')).not.toBeInTheDocument()
  })
})
