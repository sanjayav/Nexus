import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import GapAnalysisPanel from '../../components/disclosure-editor/GapAnalysisPanel'
import type { NexusQuestionnaireItem } from '../../lib/api'

const ITEMS: NexusQuestionnaireItem[] = [
  {
    id: 'qi-1',
    section: 'Climate Change',
    subsection: 'E1-6 Gross GHG Emissions',
    gri_code: 'E1-6',
    line_item: 'Biogenic CO₂ emissions',
    unit: 'tCO2e',
    scope_split: null,
    default_workflow_role: 'FM',
    entry_mode_default: 'Manual',
    target_fy2026: null,
    footnote_refs: [],
    reporting_scope: 'group',
  },
]

function renderPanel(onOpenCell = () => {}) {
  return render(
    <MemoryRouter>
      <GapAnalysisPanel
        frameworkId="csrd-e1"
        reportingYear={2026}
        items={ITEMS}
        onOpenCell={onOpenCell}
      />
    </MemoryRouter>,
  )
}

describe('<GapAnalysisPanel />', () => {
  it('renders the question input + suggested prompts', () => {
    renderPanel()
    expect(screen.getByTestId('gap-analysis-panel')).toBeInTheDocument()
    // Question textarea
    expect(screen.getByLabelText('Question')).toBeInTheDocument()
    // At least one suggested prompt visible
    expect(screen.getByText(/Show all gaps/i)).toBeInTheDocument()
  })

  it('calls the API and renders the structured response', async () => {
    renderPanel()
    const textarea = screen.getByLabelText('Question') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'what is missing' } })

    const submit = screen.getByRole('button', { name: /Analyse/i })
    fireEvent.click(submit)

    // Summary appears after API resolves
    await waitFor(() => {
      expect(screen.getByText(/your portfolio is 60% complete/i)).toBeInTheDocument()
    }, { timeout: 4000 })

    // Missing items rendered
    expect(screen.getByText(/Biogenic CO₂ emissions/i)).toBeInTheDocument()
    // Recommended next steps rendered
    expect(screen.getByText(/Add biogenic CO₂ as a separate line item/i)).toBeInTheDocument()
  })

  it('invokes onOpenCell when the user clicks a missing-item "Open" button', async () => {
    const onOpenCell = vi.fn()
    renderPanel(onOpenCell)

    const textarea = screen.getByLabelText('Question') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'show all gaps' } })
    fireEvent.click(screen.getByRole('button', { name: /Analyse/i }))

    // Wait for results — locate the missing item for E1-6 / Biogenic
    await waitFor(() => {
      expect(screen.getByText(/Biogenic CO₂ emissions/i)).toBeInTheDocument()
    }, { timeout: 4000 })

    // The Open button is rendered when a matching questionnaire item exists.
    const openButtons = screen.getAllByRole('button', { name: /^Open/i })
    expect(openButtons.length).toBeGreaterThan(0)
    fireEvent.click(openButtons[0])

    expect(onOpenCell).toHaveBeenCalledWith('qi-1')
  })
})
