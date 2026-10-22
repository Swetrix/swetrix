import { useCallback, useEffect, useRef, useState } from 'react'

import { PADDLE_JS_URL, PADDLE_VENDOR_ID } from '~/lib/constants'

const LOAD_TIMEOUT_MS = 15_000

type PaddleListener = (eventData: any) => void

let initStarted = false
let paddleReady = false
let paddleError = false
let initializedPaddle: any = null
const listeners = new Set<PaddleListener>()
const stateSubscribers = new Set<() => void>()

function notifyStateSubscribers() {
  for (const cb of stateSubscribers) cb()
}

function initPaddle() {
  if (initStarted || (paddleReady && initializedPaddle === window.Paddle))
    return
  initStarted = true
  paddleReady = false
  paddleError = false
  notifyStateSubscribers()

  const script = document.createElement('script')
  script.src = PADDLE_JS_URL
  script.async = true

  const finish = (ready: boolean) => {
    clearTimeout(timeout)
    script.onload = null
    script.onerror = null
    initStarted = false
    paddleReady = ready
    paddleError = !ready
    if (!ready) script.remove()
    notifyStateSubscribers()
  }

  const timeout = setTimeout(() => finish(false), LOAD_TIMEOUT_MS)

  script.onload = () => {
    try {
      const paddle = window.Paddle
      if (
        typeof paddle?.Setup !== 'function' ||
        typeof paddle?.Checkout?.open !== 'function'
      ) {
        finish(false)
        return
      }

      paddle.Setup({
        vendor: PADDLE_VENDOR_ID,
        eventCallback: (eventData: any) => {
          for (const listener of listeners) listener(eventData)
        },
      })
      initializedPaddle = paddle
      finish(true)
    } catch {
      finish(false)
    }
  }
  script.onerror = () => finish(false)

  try {
    document.body.appendChild(script)
  } catch {
    finish(false)
  }
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

    stateSubscriber()

    initPaddle()

    return () => {
      listeners.delete(listener)
      stateSubscribers.delete(stateSubscriber)
    }
  }, [])

  const openCheckout = useCallback(
    (checkoutOptions: Record<string, any>): boolean => {
      if (typeof window === 'undefined') return false

      try {
        if (paddleReady && initializedPaddle === window.Paddle) {
          initializedPaddle.Checkout.open(checkoutOptions)
          return true
        }
      } catch {
        paddleReady = false
        paddleError = true
        notifyStateSubscribers()
      }

      try {
        const url = new URL(checkoutOptions.override)
        if (
          url.protocol !== 'https:' ||
          (url.hostname !== 'paddle.com' &&
            !url.hostname.endsWith('.paddle.com')) ||
          url.username ||
          url.password
        ) {
          return false
        }

        window.location.assign(url.href)
        return true
      } catch {
        return false
      }
    },
    [],
  )

  return { isPaddleLoaded, paddleLoadError, openCheckout }
}
