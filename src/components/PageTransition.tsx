import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'

/**
 * PageTransition — wraps routed content with a subtle fade/rise on navigation.
 * Uses AnimatePresence keyed on pathname so route changes trigger the enter anim.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
