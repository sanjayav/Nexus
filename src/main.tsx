import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { AuthProvider } from './auth/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { RBACProvider } from './contexts/RBACContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <RBACProvider>
          <App />
        </RBACProvider>
      </AuthProvider>
    </LanguageProvider>
  </React.StrictMode>,
)


