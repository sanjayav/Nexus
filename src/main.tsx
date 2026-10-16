import React from 'react'
import ReactDOM from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import App from './App'
import './index.css'
import { AuthProvider } from './auth/AuthContext'
import { ThemeProvider } from './theme/ThemeContext'
import { FrameworkProvider } from './lib/FrameworkProvider'
import { DensityProvider } from './lib/density'
import { initSentry } from './lib/sentry'
import { defaultTransition } from './motion/tokens'
// Initialise i18n side-effect-style so it's ready before any component renders.
import './i18n'

// No-op when VITE_SENTRY_DSN is unset — safe to call unconditionally.
initSentry()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* One motion rhythm app-wide; framer animations honour the OS
        reduced-motion setting (the CSS guard only covers CSS). */}
    <MotionConfig reducedMotion="user" transition={defaultTransition}>
      <ThemeProvider>
        <DensityProvider>
          <AuthProvider>
            <FrameworkProvider>
              <App />
            </FrameworkProvider>
          </AuthProvider>
        </DensityProvider>
      </ThemeProvider>
    </MotionConfig>
  </React.StrictMode>,
)
