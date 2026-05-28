import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { AuthProvider } from '../../auth/AuthContext'

// Stub the 3D scene so jsdom doesn't try to load WebGL.
vi.mock('../../components/SplineScene', () => ({
  SplineScene: () => null,
}))
vi.mock('../../components/Spotlight', () => ({
  Spotlight: () => null,
}))

// Mock useNavigate so we can assert navigation without re-rendering.
const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

import Login from '../../pages/Login'

function renderLogin() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('<Login />', () => {
  beforeEach(() => {
    navigateMock.mockClear()
  })

  it('renders email and password inputs and a sign-in button', () => {
    renderLogin()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows an alert with role="alert" for invalid credentials', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com')
    await user.type(screen.getByLabelText(/password/i), 'badpass')
    fireEvent.submit(screen.getByLabelText(/email/i).closest('form')!)
    await waitFor(() => {
      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
    })
  })

  it('navigates to the home route on successful login', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByLabelText(/email/i), 'admin@aeiforo.com')
    await user.type(screen.getByLabelText(/password/i), 'demo2026')
    fireEvent.submit(screen.getByLabelText(/email/i).closest('form')!)
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('switches to register mode and surfaces Name + Workspace fields', async () => {
    const user = userEvent.setup()
    renderLogin()
    const toggle = screen.getByRole('button', { name: /create one/i })
    await user.click(toggle)
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/workspace/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })
})
