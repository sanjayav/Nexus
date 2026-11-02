import { ReactNode } from 'react'
import { MotionConfig } from 'motion/react'
import { AuthProvider } from '@/features/auth/AuthContext'
import { AccessProvider } from '@/features/access/AccessContext'
import { WorkspaceProvider } from '@/features/workspace/WorkspaceContext'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'

/** Provider order matters: workspace defaults depend on language; access resolves the signed-in user to a workspace member. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LanguageProvider>
        <WorkspaceProvider>
          <AuthProvider>
            <AccessProvider>{children}</AccessProvider>
          </AuthProvider>
        </WorkspaceProvider>
      </LanguageProvider>
    </MotionConfig>
  )
}
