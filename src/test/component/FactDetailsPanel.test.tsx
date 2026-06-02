import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../server'
import { AuthProvider } from '../../auth/AuthContext'
import FactDetailsPanel from '../../components/disclosure-editor/FactDetailsPanel'
import type { NexusQuestionnaireItem } from '../../lib/api'
import type { QuestionAssignment } from '../../lib/orgStore'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

const ITEM: NexusQuestionnaireItem = {
  id: 'qi-1',
  section: 'Climate Change',
  subsection: 'E1-6 Gross GHG Emissions',
  gri_code: 'E1-6',
  line_item: 'Gross Scope 1 GHG emissions',
  unit: 'tCO2e',
  scope_split: 'scope_1',
  default_workflow_role: 'FM',
  entry_mode_default: 'Manual',
  target_fy2026: null,
  footnote_refs: [],
  reporting_scope: 'group',
}

const ASSIGNMENT: QuestionAssignment = {
  id: 'a1',
  framework_id: 'csrd-e1',
  questionId: 'qi-1',
  gri_code: 'E1-6',
  line_item: 'Gross Scope 1 GHG emissions',
  entityId: 'e1',
  assigneeId: 'u102',
  assigneeName: 'Maria Santos',
  assigneeEmail: 'fm@aeiforo.com',
  entry_modes: ['Manual'],
  used_mode: 'Manual',
  due_date: null,
  assigned_by: 'admin@aeiforo.com',
  assigned_at: new Date().toISOString(),
  status: 'in_progress',
  value: 4521,
  unit: 'tCO2e',
  evidence_ids: [],
  last_updated: new Date().toISOString(),
}

beforeEach(() => {
  navigateMock.mockClear()
  localStorage.setItem('aeiforo_token', 'fake-jwt')
  localStorage.setItem('aeiforo_auth_user', JSON.stringify({
    id: 'u1', email: 'admin@aeiforo.com', name: 'Test Admin', role: 'PA', tenantId: 'o1',
    roles: ['platform_admin'], permissions: ['data.upload', 'data.approve'],
  }))
})

function renderPanel() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <FactDetailsPanel
          item={ITEM}
          assignment={ASSIGNMENT}
          reportingYear={2026}
          currentFrameworkId="csrd-e1"
        />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('<FactDetailsPanel />', () => {
  it('renders concept, dimensions, fiscal period and source value', async () => {
    renderPanel()
    expect(screen.getByTestId('fact-details-panel')).toBeInTheDocument()
    // Concept
    expect(screen.getByText('Gross Scope 1 GHG emissions')).toBeInTheDocument()
    // Dimensions
    expect(screen.getByText('Period FY2026')).toBeInTheDocument()
    // Scope split chip (exact "scope 1" lowercase from scope_1 token).
    expect(screen.getByText('scope 1', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('Group')).toBeInTheDocument()
    // Fiscal period
    expect(screen.getByText(/2026-01-01.*2026-12-31/)).toBeInTheDocument()
    // Source value formatted with unit
    expect(screen.getByText(/4,521\s+tCO2e/)).toBeInTheDocument()
  })

  it('renders "Other Fact Locations" chips and navigates on click', async () => {
    // Override the concept-mappings handler to return peers across frameworks.
    server.use(
      http.get('/api/concept-mappings', () =>
        HttpResponse.json({
          concept_key: 'ghg.scope1.gross',
          mappings: [
            {
              id: 'cm-1', concept_key: 'ghg.scope1.gross', framework_id: 'gri',
              questionnaire_item_id: 'qi-gri-305', unit_conversion: 1,
              gri_code: 'GRI 305-1', line_item: 'Direct emissions', unit: 'tCO2e', section: 'Emissions',
            },
            {
              id: 'cm-2', concept_key: 'ghg.scope1.gross', framework_id: 'issb-s2',
              questionnaire_item_id: 'qi-issb-29a', unit_conversion: 1,
              gri_code: 'ISSB S2-29(a)', line_item: 'Scope 1', unit: 'tCO2e', section: 'Metrics',
            },
          ],
        })),
    )

    renderPanel()
    await waitFor(() => {
      expect(screen.getByTestId('fact-peer-gri')).toBeInTheDocument()
      expect(screen.getByTestId('fact-peer-issb-s2')).toBeInTheDocument()
    }, { timeout: 4000 })

    // Click a peer → navigates to /disclosure-editor/<framework>?cell=<id>
    fireEvent.click(screen.getByTestId('fact-peer-gri'))
    expect(navigateMock).toHaveBeenCalledWith('/disclosure-editor/gri?cell=qi-gri-305')
  })
})
