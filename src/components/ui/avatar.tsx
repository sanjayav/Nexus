import clsx from 'clsx'

/** Two Latin initials, or the given name for Chinese names (王敏 → 王敏, 欧阳志远 → 志远). */
export function initialsOf(name: string): string {
  const n = name.trim()
  if (/[一-鿿]/.test(n)) return n.length > 2 ? n.slice(-2) : n
  const parts = n.split(/[\s@._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?'
}

/** Neutral initials disc. Colour is reserved for meaning, so avatars stay monochrome; `muted` marks people not yet active. */
export function Avatar({
  name,
  size = 'md',
  muted,
  className,
}: {
  name: string
  size?: 'sm' | 'md' | 'lg'
  muted?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={clsx(
        'shrink-0 inline-flex items-center justify-center rounded-full font-semibold select-none',
        muted
          ? 'bg-white text-zinc-400 border border-dashed border-zinc-300'
          : 'bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-900/[0.06]',
        size === 'sm' && 'w-6 h-6 text-[10px]',
        size === 'md' && 'w-8 h-8 text-[11px]',
        size === 'lg' && 'w-12 h-12 text-sm',
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  )
}
