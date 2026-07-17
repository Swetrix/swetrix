import { useEffect, useRef, useState } from 'react'

interface UseInViewOnceOptions {
  rootMargin?: string
  disabled?: boolean
}

export const useInViewOnce = <T extends HTMLElement = HTMLDivElement>({
  rootMargin = '400px 0px',
  disabled,
}: UseInViewOnceOptions = {}) => {
  const ref = useRef<T | null>(null)
  const [hasBeenInView, setHasBeenInView] = useState(false)

  useEffect(() => {
    if (disabled || hasBeenInView) {
      if (disabled) setHasBeenInView(true)
      return
    }

    const element = ref.current

    if (!element || typeof IntersectionObserver === 'undefined') {
      setHasBeenInView(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setHasBeenInView(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [disabled, hasBeenInView, rootMargin])

  return { ref, hasBeenInView }
}
