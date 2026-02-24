import { useEffect, useRef, useState } from 'react'

import { PADDLE_JS_URL, PADDLE_VENDOR_ID } from '~/lib/constants'
import { loadScript } from '~/utils/generic'

const POLL_INTERVAL_MS = 200
const MAX_ATTEMPTS = 50 // 10 seconds

interface UsePaddleOptions {
  onEvent?: (eventData: any) => void
}

interface UsePaddleResult {
  isPaddleLoaded: boolean
  paddleLoadError: boolean
}

export function usePaddle(options: UsePaddleOptions = {}): UsePaddleResult {
  const [isPaddleLoaded, setIsPaddleLoaded] = useState(false)
  const [paddleLoadError, setPaddleLoadError] = useState(false)
  const onEventRef = useRef(options.onEvent)
  onEventRef.current = options.onEvent

  useEffect(() => {
    loadScript(PADDLE_JS_URL)

    let attempts = 0

    const interval = setInterval(() => {
      attempts += 1

      if ((window as any)?.Paddle) {
        ;(window as any).Paddle.Setup({
          vendor: PADDLE_VENDOR_ID,
          eventCallback: (eventData: any) => {
            onEventRef.current?.(eventData)
          },
        })
        setIsPaddleLoaded(true)
        clearInterval(interval)
        return
      }

      if (attempts >= MAX_ATTEMPTS) {
        setPaddleLoadError(true)
        clearInterval(interval)
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [])

  return { isPaddleLoaded, paddleLoadError }
}
