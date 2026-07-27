import { GlobeIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'

import { cn } from '~/utils/generic'
import { extractDomain } from '~/utils/url'

const DEBOUNCE_MS = 350

interface FaviconGlyphProps {
  value: string
  className?: string
}

/**
 * The leading glyph of a "your website" input. Once what's being typed resolves
 * to a plausible domain (debounced, so we don't hammer /api/favicon on every
 * keystroke) the globe swaps for the site's own favicon - a small, immediate
 * "we see your site" signal.
 */
const FaviconGlyph = ({ value, className }: FaviconGlyphProps) => {
  const prefersReducedMotion = useReducedMotion()
  const [domain, setDomain] = useState<string | null>(null)

  useEffect(() => {
    const timeout = setTimeout(
      () => setDomain(extractDomain(value)),
      DEBOUNCE_MS,
    )
    return () => clearTimeout(timeout)
  }, [value])

  return (
    <AnimatePresence mode='wait' initial={false}>
      {domain ? (
        <motion.img
          key={domain}
          src={`/api/favicon?domain=${encodeURIComponent(domain)}`}
          alt=''
          loading='lazy'
          initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          // Favicons are drawn for whatever background their own site uses, so
          // plenty of them are solid black. The white plate keeps them legible
          // on the dark hero and in dark mode.
          className={cn('rounded-sm bg-white p-px', className)}
        />
      ) : (
        <motion.span key='globe' initial={false} animate={{ opacity: 1 }}>
          <GlobeIcon className={className} />
        </motion.span>
      )}
    </AnimatePresence>
  )
}

export default FaviconGlyph
