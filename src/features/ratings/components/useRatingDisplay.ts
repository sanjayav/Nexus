import { useMemo } from 'react'
import { useFormat } from '@/lib/i18n'
import type { Rating } from '@/features/ratings/data'

/** Formats a rating value in the agency's own units (grade, 0–100 score, risk score). */
export function useRatingDisplay() {
  const f = useFormat()
  return useMemo(
    () => (r: Rating, value: string | number) =>
      r.kind === 'grade'
        ? String(value)
        : r.kind === 'risk'
          ? f.number(Number(value), { minimumFractionDigits: 1, maximumFractionDigits: 1 })
          : f.number(Number(value)),
    [f],
  )
}

/** Compact select used in toolbars and inline row editors. */
export const compactSelect =
  'h-8 pl-2.5 pr-7 rounded-lg bg-white border border-line text-[13px] text-zinc-800 shadow-card hover:border-zinc-300 focus:outline-none focus:ring-[3px] focus:ring-brand-500/20 focus:border-brand-600 max-w-full truncate'
