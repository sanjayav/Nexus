import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { AuthProvider } from './auth/AuthContext'
import { ThemeProvider } from './theme/ThemeContext'
import { FrameworkProvider } from './lib/FrameworkProvider'
import { DensityProvider } from './lib/density'
import { initSentry } from './lib/sentry'
// Initialise i18n side-effect-style so it's ready before any component renders.
import './i18n'

// No-op when VITE_SENTRY_DSN is unset — safe to call unconditionally.
initSentry()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <DensityProvider>
        <AuthProvider>
          <FrameworkProvider>
            <App />
          </FrameworkProvider>
        </AuthProvider>
      </DensityProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
