import { useEffect, useState } from 'react'

// Tailwind default breakpoints in pixels
const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

type Breakpoint = keyof typeof breakpoints

const useBreakpoint = (breakpoint: Breakpoint) => {
  const [isAboveBreakpoint, setIsAboveBreakpoint] = useState(false)

  useEffect(() => {
    const checkBreakpoint = () => {
      setIsAboveBreakpoint(window.innerWidth >= breakpoints[breakpoint])
    }

    checkBreakpoint()

    window.addEventListener('resize', checkBreakpoint)

    return () => window.removeEventListener('resize', checkBreakpoint)
  }, [breakpoint])

  return isAboveBreakpoint
}

export default useBreakpoint
