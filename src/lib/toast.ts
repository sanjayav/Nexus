import { toast } from 'sonner'

/**
 * Thin app-level wrapper around `sonner` so callers never import the library
 * directly. Swapping providers later (Radix, custom) means changing one file.
 *
 * Conventions:
 * - `showError` is for user-actionable failures ("save failed", "network
 *   error"). Background poll failures should stay inline, not toasted.
 * - `showSuccess` for confirmations that the user already expects ("saved").
 * - `showInfo` / `showWarning` for non-blocking signals.
 */
export const showError   = (msg: string) => toast.error(msg)
export const showSuccess = (msg: string) => toast.success(msg)
export const showInfo    = (msg: string) => toast.info(msg)
export const showWarning = (msg: string) => toast.warning(msg)
