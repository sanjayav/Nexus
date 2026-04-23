import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { AuthProvider } from './auth/AuthContext'
import { ThemeProvider } from './theme/ThemeContext'
import { FrameworkProvider } from './lib/FrameworkProvider'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <FrameworkProvider>
          <App />
        </FrameworkProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
