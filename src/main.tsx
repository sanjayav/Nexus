import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { AuthProvider } from './auth/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { RBACProvider } from './contexts/RBACContext'
import { WorkspaceProvider } from './workspace/WorkspaceContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <WorkspaceProvider>
        <AuthProvider>
          <RBACProvider>
            <App />
          </RBACProvider>
        </AuthProvider>
      </WorkspaceProvider>
    </LanguageProvider>
  </React.StrictMode>,
)


