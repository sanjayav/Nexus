import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import { AuthProvider } from '../../auth/AuthContext'

// Pre-seed the auth state so DisclosureEditor renders behind ProtectedRoute-like checks.
beforeEach(() => {
  localStorage.setItem('aeiforo_token', 'fake-jwt')
  localStorage.setItem('aeiforo_auth_user', JSON.stringify({
    id: 'u1', email: 'admin@aeiforo.com', name: 'Test Admin', role: 'PA', tenantId: 'o1',
    roles: ['platform_admin'], permissions: ['data.upload', 'workflow.approve', 'reports.publish'],
  }))
})

// Avoid jsdom complaints about scrollIntoView.
beforeAll(() => {
  if (!('scrollIntoView' in Element.prototype)) {
    Object.defineProperty(Element.prototype, 'scrollIntoView', { value: vi.fn(), writable: true })
  } else {
    vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {})
  }
})

import DisclosureEditor from '../../pages/DisclosureEditor'

function renderEditor(frameworkId = 'csrd-e1') {
  return render(
    <MemoryRouter initialEntries={[`/disclosure-editor/${frameworkId}`]}>
      <AuthProvider>
        <Routes>
          <Route path="/disclosure-editor/:frameworkId" element={<DisclosureEditor />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('<DisclosureEditor />', () => {
  it('renders without crashing and shows the loading state then a document', async () => {
    renderEditor()
    // Once data resolves the framework name should appear in the top bar.
    await waitFor(() => {
      expect(screen.getByText(/CSRD ESRS E1 — Climate Change/i)).toBeInTheDocument()
    }, { timeout: 4000 })
  })

  it('shows the framework name and FY year in the top bar', async () => {
    renderEditor()
    await waitFor(() => {
      expect(screen.getByText(/CSRD ESRS E1 — Climate Change/i)).toBeInTheDocument()
      expect(screen.getByText(/FY2026/i)).toBeInTheDocument()
    }, { timeout: 4000 })
  })

  it('renders subsection items in the left rail tree', async () => {
    renderEditor()
    await waitFor(() => {
      expect(screen.getByText(/E1-6 Gross GHG Emissions/i)).toBeInTheDocument()
    }, { timeout: 4000 })
  })

  it('updates the active subsection state when a tree item is clicked', async () => {
    renderEditor()
    let treeButton: HTMLElement | null = null
    await waitFor(() => {
      treeButton = screen.queryByTestId('tree-item-Climate Change::E1-6 Gross GHG Emissions')
      expect(treeButton).not.toBeNull()
    }, { timeout: 4000 })
    fireEvent.click(treeButton!)
    // After click the button should have aria-current="true".
    expect(treeButton!.getAttribute('aria-current')).toBe('true')
  })
})
