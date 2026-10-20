import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { BarChart3, Check, ClipboardList, ListChecks, type LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { useStrings } from '@/lib/i18n'
import { usePreferences, type Persona } from '@/store/preferences'
import { Button, Dialog, spring } from '@/components/ui'
import { helpStrings } from './help.strings'

const PERSONAS: { id: Persona; icon: LucideIcon; home: string }[] = [
  { id: 'executive', icon: BarChart3, home: '/executive' },
  { id: 'preparer', icon: ClipboardList, home: '/tasks' },
  { id: 'reviewer', icon: ListChecks, home: '/tasks' },
]

/** First-run setup: one question, so each kind of user lands on the screen that serves them. */
export default function WelcomeDialog() {
  const s = useStrings(helpStrings).welcome
  const navigate = useNavigate()
  const { onboarded, persona, textSize, setPersona, setTextSize, completeOnboarding } = usePreferences()
  const [choice, setChoice] = useState<Persona>(persona ?? 'executive')
  const [large, setLarge] = useState(textSize === 'large')

  const finish = (apply: boolean) => {
    if (apply) {
      setPersona(choice)
      setTextSize(large ? 'large' : 'standard')
      navigate(PERSONAS.find(p => p.id === choice)!.home)
    }
    completeOnboarding()
  }

  return (
    <Dialog
      open={!onboarded}
      onClose={() => finish(false)}
      title={s.title}
      description={s.body}
      width="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={() => finish(false)}>
            {s.skip}
          </Button>
          <Button variant="primary" data-autofocus onClick={() => finish(true)}>
            {s.start}
          </Button>
        </>
      }
    >
      <div role="radiogroup" className="space-y-2">
        {PERSONAS.map(p => {
          const active = choice === p.id
          const copy = s.personas[p.id]
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setChoice(p.id)}
              className={clsx(
                'relative w-full flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors',
                active ? 'border-zinc-900' : 'border-line hover:border-zinc-300',
              )}
            >
              {active && (
                <motion.span
                  layoutId="persona-ring"
                  transition={spring}
                  className="absolute inset-0 rounded-xl ring-2 ring-zinc-900 pointer-events-none"
                />
              )}
              <span
                className={clsx(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  active ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600',
                )}
              >
                <p.icon className="w-5 h-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-zinc-900">{copy.title}</span>
                <span className="block mt-0.5 text-[13px] text-zinc-500 leading-relaxed">{copy.desc}</span>
              </span>
              {active && <Check className="w-5 h-5 text-zinc-900 shrink-0" />}
            </button>
          )
        })}
      </div>
      <label className="mt-4 flex items-start gap-3 rounded-xl bg-zinc-50 border border-line p-3.5 cursor-pointer">
        <input type="checkbox" checked={large} onChange={e => setLarge(e.target.checked)} className="mt-0.5 w-4 h-4 accent-zinc-900" />
        <span>
          <span className="block text-[14px] font-medium text-zinc-900">{s.largeText}</span>
          <span className="block text-[12.5px] text-zinc-500">{s.largeTextDesc}</span>
        </span>
      </label>
    </Dialog>
  )
}
