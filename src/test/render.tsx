import { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { useReportingStore } from '@/store/reporting'
import { usePreferences } from '@/store/preferences'

export const TEST_USER = { email: 'user1@marklytics.co.uk', name: '王敏', role: 'Admin' }

/** Render a routed page inside the real providers, signed in, for a given workspace and language. */
export function renderPage(
  path: string,
  routes: { path: string; element: ReactNode }[],
  opts: { locale?: 'zh' | 'en'; workspace?: string } = {},
) {
  localStorage.clear()
  localStorage.setItem('aeiforo_auth_user', JSON.stringify(TEST_USER))
  localStorage.setItem('aeiforo_language', opts.locale ?? 'zh')
  localStorage.setItem('aeiforo_workspace', opts.workspace ?? 'lvyuan')
  useReportingStore.setState({ workspaces: {} })
  usePreferences.setState({ onboarded: true })
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          {routes.map(r => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
        </Routes>
      </MemoryRouter>
    </AppProviders>,
  )
}

export const slice = (ws = 'lvyuan') => useReportingStore.getState().workspaces[ws]
