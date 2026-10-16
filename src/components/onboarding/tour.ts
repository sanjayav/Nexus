/**
 * The one optional product tour. It runs once on a user's first visit
 * (ProductTour, mounted in App) and can be replayed from the guided setup.
 *
 *   startTour()  — replays the tour for the signed-in user
 */
export const TOUR_EVENT = 'nexus:tour:start'
export const TOUR_KEY_PREFIX = 'aeiforo_tour_completed_'

export function startTour() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(TOUR_EVENT))
}
