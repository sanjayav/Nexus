import { useAuth } from '../auth/AuthContext'
import ProductTour from './ProductTour'

/**
 * GuidedTour — retired as a separate tour. Kept as a thin alias so existing
 * imports keep working: it renders the one optional product tour
 * (`ProductTour`) for the signed-in user. App already mounts ProductTour, so
 * pages should not mount this as well.
 */
export default function GuidedTour() {
  const { user } = useAuth()
  if (!user) return null
  return <ProductTour userId={user.id ?? user.email} />
}
