import { useCallback, useEffect, useRef, useState } from 'react'

import { PADDLE_JS_URL, PADDLE_VENDOR_ID } from '~/lib/constants'
import { loadScript } from '~/utils/generic'

const POLL_INTERVAL_MS = 200
const MAX_ATTEMPTS = 50 // 10 seconds

type PaddleListener = (eventData: any) => void

let initStarted = false
let paddleReady = false
let paddleError = false
const listeners = new Set<PaddleListener>()
const stateSubscribers = new Set<() => void>()

function notifyStateSubscribers() {
  for (const cb of stateSubscribers) cb()
}

function initPaddle() {
  if (initStarted) return
  initStarted = true

  loadScript(PADDLE_JS_URL)

  let attempts = 0
  const interval = setInterval(() => {
    attempts += 1

    if ((window as any)?.Paddle) {
      ;(window as any).Paddle.Setup({
        vendor: PADDLE_VENDOR_ID,
        eventCallback: (eventData: any) => {
          for (const listener of listeners) listener(eventData)
        },
      })
      paddleReady = true
      notifyStateSubscribers()
      clearInterval(interval)
      return
    }

    if (attempts >= MAX_ATTEMPTS) {
      paddleError = true
      notifyStateSubscribers()
      clearInterval(interval)
    }
  }, POLL_INTERVAL_MS)
}

interface UsePaddleOptions {
  onEvent?: (eventData: any) => void
}

interface UsePaddleResult {
  isPaddleLoaded: boolean
  paddleLoadError: boolean
  openCheckout: (options: Record<string, any>) => boolean
}

export function usePaddle(options: UsePaddleOptions = {}): UsePaddleResult {
  const [isPaddleLoaded, setIsPaddleLoaded] = useState(paddleReady)
  const [paddleLoadError, setPaddleLoadError] = useState(paddleError)
  const onEventRef = useRef(options.onEvent)
  onEventRef.current = options.onEvent

  useEffect(() => {
    const listener: PaddleListener = (eventData) => {
      onEventRef.current?.(eventData)
    }
    listeners.add(listener)

    const stateSubscriber = () => {
      setIsPaddleLoaded(paddleReady)
      setPaddleLoadError(paddleError)
    }
    stateSubscribers.add(stateSubscriber)

    // Sync state in case init already completed before this effect ran
    stateSubscriber()

    initPaddle()

    return () => {
      listeners.delete(listener)
      stateSubscribers.delete(stateSubscriber)
    }
  }, [])

  const openCheckout = useCallback(
    (checkoutOptions: Record<string, any>): boolean => {
      if (!(window as any)?.Paddle) return false

      try {
        ;(window as any).Paddle.Checkout.open(checkoutOptions)
        return true
      } catch {
        return false
      }
    },
    [],
  )

  return { isPaddleLoaded, paddleLoadError, openCheckout }
}
