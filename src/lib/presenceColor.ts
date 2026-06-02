/**
 * Per-user colour palette for Liveblocks presence — mirrored byte-for-byte by
 * `api/_color.ts`. We keep two copies so the React bundle never imports from
 * `api/` (which depends on `@vercel/node`) and the serverless function never
 * imports from `src/` (which depends on React). Both modules must stay in
 * lockstep — same palette order, same hash function.
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
