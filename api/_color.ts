/**
 * Deterministic per-user colour palette. Lives in `api/` because both the
 * Liveblocks auth endpoint (Node) and the browser client need the exact same
 * value — and the React-side module pulls `@liveblocks/react`, which would
 * crash inside a Vercel serverless function.
 *
 * The browser side re-exports `colorFor` from `src/lib/liveblocks.ts` so callers
 * don't need to know about this module.
 */

const PALETTE = [
  '#10B981', // emerald
  '#3B82F6', // blue
  '#F59E0B', // amber
  '#EC4899', // pink
  '#8B5CF6', // violet
  '#14B8A6', // teal
  '#F97316', // orange
  '#EF4444', // red
] as const

export function colorFor(userId: string): string {
  if (!userId) return PALETTE[0]
  let h = 0
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) | 0
  return PALETTE[Math.abs(h) % PALETTE.length]
}
