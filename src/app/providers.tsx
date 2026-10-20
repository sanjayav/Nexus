import { ReactNode } from 'react'
import { MotionConfig } from 'motion/react'
import { AuthProvider } from '@/features/auth/AuthContext'
import { RBACProvider } from '@/features/access/RBACContext'
import { WorkspaceProvider } from '@/features/workspace/WorkspaceContext'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'

/** Provider order matters: workspace defaults depend on language; RBAC depends on the signed-in user. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LanguageProvider>
        <WorkspaceProvider>
          <AuthProvider>
            <RBACProvider>{children}</RBACProvider>
          </AuthProvider>
        </WorkspaceProvider>
      </LanguageProvider>
    </MotionConfig>
  )
}
