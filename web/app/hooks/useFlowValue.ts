import { useEffect, useState } from 'react'

/**
 * NumberFlow pads digits vertically to mask the rolling animation: ~0.125em
 * (`round(nearest, 0.25em / 2, 1px)`) is added twice per side — on
 * `.number__inner` and again via `.digit__num` raising the inner line box.
 * Cancel both with a negative margin (same expression, so it matches at any
 * zoom level) to keep plain-text line metrics.
 */
export const FLOW_VALUE_CLASS = 'my-[calc(-2*round(nearest,0.125em,1px))]'

/**
 * number-flow defaults to 900ms digit spins / 450ms fades — marketing pace.
 * Dashboard numbers change dozens of times a day, so keep them crisp.
 */
export const FLOW_TIMING = {
  transformTiming: { duration: 550, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
  spinTiming: { duration: 550, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
  opacityTiming: { duration: 350, easing: 'ease-out' },
}

/**
 * NumberFlow only animates value *changes*, not the initial render.
 * Starting from zero and updating to the real value right after mount
 * makes the number roll in on page load as well.
 */
export const useFlowValue = (value?: number) => {
  const target = Number.isFinite(value) ? (value as number) : 0
  const [flowValue, setFlowValue] = useState(0)

  useEffect(() => {
    setFlowValue(target)
  }, [target])

  return flowValue
}
