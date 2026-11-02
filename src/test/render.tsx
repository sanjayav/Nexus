import { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { useReportingStore } from '@/store/reporting'
import { usePreferences } from '@/store/preferences'
import { useAccessStore } from '@/features/access/store'
import { DEMO_EMAIL } from '@/data/people'

/** Seeded accounts (see src/data/people.ts) by the role they play in the lvyuan workspace. */
export const AS = {
  admin: DEMO_EMAIL,
  contributor: 'chen.gang@lvyuan-demo.example',
  reviewer: 'li.na@lvyuan-demo.example',
  approver: 'zhou.jing@lvyuan-demo.example',
  auditor: 'zheng.mingxuan@assurance-demo.example',
}

/**
 * Render a routed page inside the real providers for a given workspace and
 * language, signed in as `email` (the demo administrator by default) or
 * signed out when `email` is null.
 */
export function renderPage(
  path: string,
  routes: { path: string; element: ReactNode }[],
  opts: { locale?: 'zh' | 'en'; workspace?: string; email?: string | null } = {},
) {
  localStorage.clear()
  const email = opts.email === undefined ? DEMO_EMAIL : opts.email
  if (email) localStorage.setItem('aeiforo_auth_user', JSON.stringify({ email }))
  localStorage.setItem('aeiforo_language', opts.locale ?? 'zh')
  localStorage.setItem('aeiforo_workspace', opts.workspace ?? 'lvyuan')
  useReportingStore.setState({ workspaces: {} })
  useAccessStore.setState({ workspaces: {} })
  usePreferences.setState({ onboarded: true, owner: email ?? null, saved: {} })
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
