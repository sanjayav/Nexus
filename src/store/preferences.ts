import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Per-user display preferences. Different people use the same product very
 * differently: a chairman wants a plain summary in large type, a data
 * preparer wants their task list, a reviewer wants the queue, and a power
 * user wants keyboard shortcuts. None of these are tenant data.
 *
 * The flat fields are the signed-in person's; `saved` keeps everyone else's
 * on a shared device, so a colleague signing in gets their own first run.
 */
export type Persona = 'executive' | 'preparer' | 'reviewer'
export type TextSize = 'standard' | 'large'
export type OverviewMode = 'summary' | 'detailed'

type Prefs = { persona: Persona | null; textSize: TextSize; overviewMode: OverviewMode; onboarded: boolean }

const DEFAULTS: Prefs = { persona: null, textSize: 'standard', overviewMode: 'detailed', onboarded: false }

interface PreferencesState extends Prefs {
  /** Email of the person the flat fields belong to. */
  owner: string | null
  saved: Record<string, Prefs>
  setPersona: (p: Persona) => void
  setTextSize: (t: TextSize) => void
  setOverviewMode: (m: OverviewMode) => void
  completeOnboarding: () => void
  /** Switch the active preferences to `email`, keeping the previous person's. */
  claim: (email: string) => void
}

export const TEXT_ZOOM: Record<TextSize, number> = { standard: 1, large: 1.15 }

const pick = ({ persona, textSize, overviewMode, onboarded }: Prefs): Prefs => ({ persona, textSize, overviewMode, onboarded })

export const usePreferences = create<PreferencesState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      owner: null,
      saved: {},
      setPersona: persona => set({ persona, overviewMode: persona === 'executive' ? 'summary' : 'detailed' }),
      setTextSize: textSize => set({ textSize }),
      setOverviewMode: overviewMode => set({ overviewMode }),
      completeOnboarding: () => set({ onboarded: true }),
      claim: email => {
        const state = get()
        if (state.owner === email) return
        // Preferences from before per-user storage belong to whoever signs in first.
        if (state.owner === null) return set({ owner: email })
        const saved = { ...state.saved, [state.owner]: pick(state) }
        set({ ...(saved[email] ?? DEFAULTS), owner: email, saved })
      },
    }),
    {
      name: 'nexus.preferences',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ persona, textSize, overviewMode, onboarded, owner, saved }) => ({
        persona,
        textSize,
        overviewMode,
        onboarded,
        owner,
        saved,
      }),
    },
  ),
)
