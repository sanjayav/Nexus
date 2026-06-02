import { render, screen, within } from '@testing-library/react'
import ComparisonTable, { type ComparisonRow } from '../../components/marketing/ComparisonTable'

/**
 * Smoke tests for <ComparisonTable />.
 *
 * Verifies:
 *   1. Each row from `rows` is rendered (feature label appears in the DOM).
 *   2. ✓ / ✗ / ◐ glyphs render via aria-labels (yes / no / partial).
 *   3. Descriptive string cells render their text verbatim.
 *   4. Competitor header reflects the `competitorName` prop.
 */

const ROWS: ComparisonRow[] = [
  { feature: 'Pricing transparency', nexus: 'yes', competitor: 'no' },
  { feature: 'Frameworks supported', nexus: '24', competitor: '18+' },
  { feature: 'AI gap analysis', nexus: 'yes', competitor: 'partial' },
  { feature: 'Self-serve trial', nexus: 'yes', competitor: 'no' },
]

describe('<ComparisonTable />', () => {
  it('renders every row\'s feature label', () => {
    render(<ComparisonTable competitorName="Acme" rows={ROWS} />)
    for (const row of ROWS) {
      // Each feature appears twice in the DOM (desktop table + mobile cards) —
      // getAllByText asserts at least one match without coupling to layout.
      expect(screen.getAllByText(row.feature).length).toBeGreaterThan(0)
    }
  })

  it('renders the competitor name in the header', () => {
    render(<ComparisonTable competitorName="Acme Corp" rows={ROWS} />)
    expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0)
  })

  it('renders yes / no / partial glyphs via aria-labels', () => {
    render(<ComparisonTable competitorName="Acme" rows={ROWS} />)
    // 4 rows × 2 cells × 2 layouts (desktop + mobile) — at minimum, each glyph
    // type should appear once.
    expect(screen.getAllByLabelText('yes').length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText('no').length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText('partial').length).toBeGreaterThan(0)
  })

  it('renders descriptive string cells verbatim', () => {
    render(<ComparisonTable competitorName="Acme" rows={ROWS} />)
    expect(screen.getAllByText('24').length).toBeGreaterThan(0)
    expect(screen.getAllByText('18+').length).toBeGreaterThan(0)
  })

  it('renders a legend with all three glyph types', () => {
    const { container } = render(
      <ComparisonTable competitorName="Acme" rows={ROWS} />
    )
    // The legend section contains "Supported", "Not supported", "Partial".
    within(container).getByText('Supported')
    within(container).getByText('Not supported')
    within(container).getByText('Partial')
  })
})
