import { useCallback, useEffect, useRef, useState } from 'react'

import { PADDLE_JS_URL, PADDLE_CLIENT_TOKEN } from '~/lib/constants'
import { loadScript } from '~/utils/generic'

const POLL_INTERVAL_MS = 200
const MAX_ATTEMPTS = 500 // 100 seconds

type PaddleEventName =
  | 'checkout.loaded'
  | 'checkout.customer.created'
  | 'checkout.completed'
  | 'checkout.closed'
  | 'checkout.error'
  | 'checkout.warning'
  | 'checkout.payment.initiated'
  | 'checkout.payment.failed'
  | 'checkout.payment.selected'

interface PaddleEventData {
  name: PaddleEventName
  data?: any
}

type PaddleListener = (eventData: PaddleEventData) => void

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
      ;(window as any).Paddle.Initialize({
        token: PADDLE_CLIENT_TOKEN,
        eventCallback: (eventData: PaddleEventData) => {
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
  onEvent?: (eventData: PaddleEventData) => void
}

interface CheckoutItem {
  priceId: string
  quantity?: number
}

export interface CheckoutOptions {
  items: CheckoutItem[]
  customer?: { email?: string }
  customData?: Record<string, string>
  settings?: {
    locale?: string
    theme?: string
    displayMode?: 'inline' | 'overlay'
    frameTarget?: string
    frameInitialHeight?: number
    frameStyle?: string
    allowLogout?: boolean
    showAddDiscounts?: boolean
  }
}

interface UsePaddleResult {
  isPaddleLoaded: boolean
  paddleLoadError: boolean
  openCheckout: (options: CheckoutOptions) => boolean
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

    stateSubscriber()

    initPaddle()

    return () => {
      listeners.delete(listener)
      stateSubscribers.delete(stateSubscriber)
    }
  }, [])

  const openCheckout = useCallback(
    (checkoutOptions: CheckoutOptions): boolean => {
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
