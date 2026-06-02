import { render, screen } from '@testing-library/react'
import TimelineGraphic from '../../components/marketing/TimelineGraphic'

/**
 * Smoke tests for <TimelineGraphic />.
 *
 * Verifies the four milestones (Hour 1 / Hour 4 / Hour 24 / Hour 48) render
 * with their titles intact. The graphic emits both desktop and mobile copies,
 * so each label is expected to appear twice in the DOM.
 */

describe('<TimelineGraphic />', () => {
  it('renders four milestone labels', () => {
    render(<TimelineGraphic />)
    expect(screen.getAllByText('HOUR 1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('HOUR 4').length).toBeGreaterThan(0)
    expect(screen.getAllByText('HOUR 24').length).toBeGreaterThan(0)
    expect(screen.getAllByText('HOUR 48').length).toBeGreaterThan(0)
  })

  it('renders all four milestone titles', () => {
    render(<TimelineGraphic />)
    for (const title of ['Sign up', 'First facility', 'Values entered', 'Draft disclosure']) {
      expect(screen.getAllByText(title).length).toBeGreaterThan(0)
    }
  })

  it('renders the closing trust copy', () => {
    render(<TimelineGraphic />)
    expect(
      screen.getByText(/All without a sales call/i)
    ).toBeInTheDocument()
  })
})
