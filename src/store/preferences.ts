import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Per-user display preferences. Different people use the same product very
 * differently: a chairman wants a plain summary in large type, a data
 * preparer wants their task list, a reviewer wants the queue, and a power
 * user wants keyboard shortcuts. None of these are tenant data.
 */
export type Persona = 'executive' | 'preparer' | 'reviewer'
export type TextSize = 'standard' | 'large'
export type OverviewMode = 'summary' | 'detailed'

interface PreferencesState {
  persona: Persona | null
  textSize: TextSize
  overviewMode: OverviewMode
  onboarded: boolean
  setPersona: (p: Persona) => void
  setTextSize: (t: TextSize) => void
  setOverviewMode: (m: OverviewMode) => void
  completeOnboarding: () => void
}

export const TEXT_ZOOM: Record<TextSize, number> = { standard: 1, large: 1.15 }

export const usePreferences = create<PreferencesState>()(
  persist(
    set => ({
      persona: null,
      textSize: 'standard',
      overviewMode: 'detailed',
      onboarded: false,
      setPersona: persona => set({ persona, overviewMode: persona === 'executive' ? 'summary' : 'detailed' }),
      setTextSize: textSize => set({ textSize }),
      setOverviewMode: overviewMode => set({ overviewMode }),
      completeOnboarding: () => set({ onboarded: true }),
    }),
    {
      name: 'nexus.preferences',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ persona, textSize, overviewMode, onboarded }) => ({ persona, textSize, overviewMode, onboarded }),
    },
  ),
)
