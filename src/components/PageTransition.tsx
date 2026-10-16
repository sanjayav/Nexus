import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { pageVariants } from '../motion/tokens'

/**
 * PageTransition — one quiet entrance per navigation: opacity 0→1, y 4→0
 * over 160 ms. No exit animation and no `mode="wait"`, so the next page
 * starts immediately (the old version spent ~280 ms fading the previous
 * page out). PageHeader owns the in-page stagger; this only lifts the page.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return (
    <motion.div key={pathname} variants={pageVariants} initial="initial" animate="enter">
      {children}
    </motion.div>
  )
}
