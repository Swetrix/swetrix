import { motion, useInView } from 'motion/react'
import React, { useEffect, useRef, useState } from 'react'

interface ScrollRevealProps {
  children: React.ReactNode
  className?: string
  /** Delay (in seconds) before revealing — for staggering sibling reveals */
  delay?: number
}

/**
 * Fade + rise on first viewport entry. SEO/no-JS safe: the server renders no
 * hidden styles (`initial={false}`); only elements measured *below* the fold
 * after hydration get hidden (instantly, while off-screen) and then rise in
 * once scrolled to. Content that is already visible on load never animates.
 */
export const ScrollReveal = ({
  children,
  className,
  delay = 0,
}: ScrollRevealProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  // Only animate elements that start below the viewport — never hide
  // something the user can already see.
  const [belowFold, setBelowFold] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (el && el.getBoundingClientRect().top > window.innerHeight) {
      setBelowFold(true)
    }
  }, [])

  const hidden = belowFold && !inView

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={hidden ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
      transition={
        hidden
          ? { duration: 0 }
          : { duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }
      }
    >
      {children}
    </motion.div>
  )
}
