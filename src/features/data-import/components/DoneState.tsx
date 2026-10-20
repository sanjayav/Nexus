import { ArrowRight, RotateCcw } from 'lucide-react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { useFrameworkLabels } from '@/lib/i18n/shared/frameworkCatalog'
import { Button, ease } from '@/components/ui'
import { dataImportStrings } from '@/features/data-import/dataImport.strings'

export interface DoneInfo {
  count: number
  sections: number
  reopened: number
}

export function DoneState({ moduleId, info, onAgain }: { moduleId: string; info: DoneInfo; onAgain: () => void }) {
  const s = useStrings(dataImportStrings)
  const f = useFormat()
  const fw = useFrameworkLabels()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center text-center py-8 sm:py-12">
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 20, mass: 0.8 }}
        className="relative w-20 h-20 rounded-full bg-emerald-50 ring-1 ring-inset ring-emerald-600/20 flex items-center justify-center"
      >
        <motion.span
          aria-hidden
          initial={{ scale: 0.8, opacity: 0.6 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.9, ease: ease.out, delay: 0.1 }}
          className="absolute inset-0 rounded-full ring-2 ring-emerald-400/50"
        />
        <svg
          viewBox="0 0 24 24"
          className="w-9 h-9 text-emerald-600"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <motion.path
            d="M5 12.5l4.5 4.5L19 7.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.32, ease: ease.out, delay: 0.18 }}
          />
        </svg>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: ease.out, delay: 0.2 }}
        className="mt-5 max-w-md"
      >
        <h2 className="text-lg font-semibold text-zinc-900 tracking-tight">{s.doneTitle}</h2>
        <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed">
          {fmt(s.doneBody, { count: f.number(info.count), sections: f.number(info.sections), framework: fw.short(moduleId) })}
        </p>
        {info.reopened > 0 && <p className="mt-1 text-[13px] text-amber-700">{fmt(s.doneReopened, { n: f.number(info.reopened) })}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="primary" iconRight={ArrowRight} onClick={() => navigate(`/modules/${moduleId}/questionnaire`)}>
            {s.goToEntry}
          </Button>
          <Button icon={RotateCcw} onClick={onAgain}>
            {s.importAnother}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
