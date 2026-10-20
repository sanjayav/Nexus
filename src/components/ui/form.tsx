import { ReactNode } from 'react'

export const inputClass =
  'w-full h-9 px-3 rounded-[10px] bg-white border border-line text-sm text-zinc-900 placeholder:text-zinc-500 shadow-card hover:border-zinc-300 focus:outline-none focus:ring-[3px] focus:ring-brand-500/20 focus:border-brand-600 transition-[box-shadow,border-color] duration-150'

export const textareaClass = inputClass.replace('h-9', 'min-h-[96px] py-2 leading-relaxed resize-y')

export function Field({ label, hint, children, htmlFor }: { label: ReactNode; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-zinc-700">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  )
}
