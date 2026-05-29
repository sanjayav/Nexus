import { render, screen, fireEvent } from '@testing-library/react'
import JargonTooltip from '../../components/JargonTooltip'

describe('<JargonTooltip />', () => {
  it('renders the underlined term', () => {
    render(<JargonTooltip term="GHG">Greenhouse gas</JargonTooltip>)
    expect(screen.getByText('GHG')).toBeInTheDocument()
  })

  it('pulls a definition from the glossary when no children are passed', () => {
    render(<JargonTooltip term="DMA" />)
    // Reveal the tooltip via the help button.
    fireEvent.click(screen.getByRole('button', { name: /What is DMA/ }))
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    expect(screen.getByText(/Double Materiality Assessment/i)).toBeInTheDocument()
  })

  it('falls back gracefully for unknown terms', () => {
    render(<JargonTooltip term="ZZZ-Unknown" />)
    fireEvent.click(screen.getByRole('button', { name: /What is ZZZ-Unknown/ }))
    expect(screen.getByText('No definition available.')).toBeInTheDocument()
  })
})
