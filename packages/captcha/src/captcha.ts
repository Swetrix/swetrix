import { getTranslations, normalizeLocale, detectBrowserLocale, type SupportedLocale } from './i18n'
import { logger } from './logger'

export {}

// @ts-ignore
const isDevelopment = window.__SWETRIX_CAPTCHA_DEV || false

const DEFAULT_API_URL = isDevelopment ? 'http://localhost:5005/v1/captcha' : 'https://api.swetrixcaptcha.com/v1/captcha'
// @ts-ignore
const API_URL: string = window.__SWETRIX_API_URL || DEFAULT_API_URL
const WORKER_URL = isDevelopment ? './pow-worker.js' : 'https://cdn.swetrixcaptcha.com/pow-worker.js'
const MSG_IDENTIFIER = 'swetrix-captcha'
const CAPTCHA_TOKEN_LIFETIME = 300 // seconds (5 minutes).

// Main-thread fallback limits (same as worker)
const MAX_ITERATIONS = 100_000_000 // 100 million attempts
const TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

const ENDPOINTS = {
  GENERATE: '/generate',
  VERIFY: '/verify',
}

enum IFRAME_MESSAGE_TYPES {
  SUCCESS = 'success',
  FAILURE = 'failure',
  TOKEN_EXPIRED = 'tokenExpired',
}

enum ACTION {
  checkbox = 'checkbox',
  failure = 'failure',
  completed = 'completed',
  loading = 'loading',
}

interface PowChallenge {
  challenge: string
  difficulty: number
}

interface PowResult {
  type: 'result'
  nonce: number
  solution: string
}

interface PowProgress {
  type: 'progress'
  attempts: number
  hashRate: number
}

let activeAction: ACTION = ACTION.checkbox
let powWorker: Worker | null = null

const getLocaleFromUrl = (): SupportedLocale => {
  const urlParams = new URLSearchParams(window.location.search)
  const lang = urlParams.get('lang')

  logger.log('lang', lang)

  if (lang) {
    return normalizeLocale(lang)
  }

  return detectBrowserLocale()
}

const currentLocale = getLocaleFromUrl()
const t = getTranslations(currentLocale)

logger.log('t:', t)

const sendMessageToLoader = (event: IFRAME_MESSAGE_TYPES, data = {}) => {
  window.parent.postMessage(
    {
      event,
      type: MSG_IDENTIFIER,
      // @ts-ignore
      cid: window.__SWETRIX_CAPTCHA_ID,
      ...data,
    },
    '*',
  )
}

/**
 * Updates the progress bar
 * @param progress - Progress value between 0 and 100, or -1 for indeterminate
 */
const updateProgressBar = (progress: number) => {
  const progressBarContainer = document.querySelector('#progress-bar-container')
  const progressBar = document.querySelector('#progress-bar') as HTMLElement | null

  if (!progressBarContainer || !progressBar) return

  if (progress < 0) {
    // Indeterminate state
    progressBarContainer.classList.add('show')
    progressBar.classList.add('indeterminate')
    progressBar.style.width = ''
    progressBarContainer.setAttribute('aria-valuenow', '0')
    progressBarContainer.removeAttribute('aria-valuenow')
  } else if (progress === 0) {
    // Hide progress bar
    progressBarContainer.classList.remove('show')
    progressBar.classList.remove('indeterminate')
    progressBar.style.width = '0%'
    progressBarContainer.setAttribute('aria-valuenow', '0')
  } else if (progress >= 100) {
    // Complete - fade out while staying at 100%
    progressBar.classList.remove('indeterminate')
    progressBar.style.width = '100%'
    progressBarContainer.setAttribute('aria-valuenow', '100')
    // Fade out after a brief moment at 100%
    setTimeout(() => {
      progressBarContainer.classList.remove('show')
      // Reset width only after fade out completes (for next use)
      setTimeout(() => {
        progressBar.style.width = '0%'
      }, 300)
    }, 400)
  } else {
    // Show determinate progress
    progressBarContainer.classList.add('show')
    progressBar.classList.remove('indeterminate')
    progressBar.style.width = `${Math.min(progress, 95)}%` // Cap at 95% until complete
    progressBarContainer.setAttribute('aria-valuenow', String(Math.round(progress)))
  }
}

/**
 * Updates ARIA attributes based on current state
 */
const updateAriaState = (action: ACTION) => {
  const captchaComponent = document.querySelector('#swetrix-captcha')
  if (!captchaComponent) return

  switch (action) {
    case ACTION.checkbox:
      captchaComponent.setAttribute('role', 'checkbox')
      captchaComponent.setAttribute('aria-checked', 'false')
      captchaComponent.setAttribute('aria-busy', 'false')
      captchaComponent.setAttribute('aria-label', t.ariaCheckbox)
      break
    case ACTION.loading:
      captchaComponent.setAttribute('role', 'status')
      captchaComponent.setAttribute('aria-checked', 'mixed')
      captchaComponent.setAttribute('aria-busy', 'true')
      captchaComponent.setAttribute('aria-label', t.ariaVerifying)
      break
    case ACTION.completed:
      captchaComponent.setAttribute('role', 'checkbox')
      captchaComponent.setAttribute('aria-checked', 'true')
      captchaComponent.setAttribute('aria-busy', 'false')
      captchaComponent.setAttribute('aria-label', t.ariaSuccess)
      break
    case ACTION.failure:
      captchaComponent.setAttribute('role', 'checkbox')
      captchaComponent.setAttribute('aria-checked', 'false')
      captchaComponent.setAttribute('aria-busy', 'false')
      captchaComponent.setAttribute('aria-label', t.ariaFailed)
      break
  }

  // Announce to screen readers
  const srStatus = document.querySelector('#sr-status')
  if (srStatus) {
    switch (action) {
      case ACTION.loading:
        srStatus.textContent = t.srLoading
        break
      case ACTION.completed:
        srStatus.textContent = t.srSuccess
        break
      case ACTION.failure:
        srStatus.textContent = t.srFailed
        break
      default:
        srStatus.textContent = ''
    }
  }
}

/**
 * Sets the provided action visible and the rest hidden with smooth transitions
 * @param {*} action checkbox | failure | completed | loading
 */
const activateAction = (action: ACTION) => {
  activeAction = action

  const statusDefault = document.querySelector('#status-default')
  const statusFailure = document.querySelector('#status-failure')
  const statusComputing = document.querySelector('#status-computing')

  const actions = {
    checkbox: document.querySelector('#checkbox'),
    failure: document.querySelector('#failure'),
    completed: document.querySelector('#completed'),
    loading: document.querySelector('#loading'),
  }

  // Hide all action elements with transitions
  // Checkbox uses fade-out class for smooth transition
  if (action !== ACTION.checkbox) {
    actions.checkbox?.classList.add('fade-out')
  } else {
    actions.checkbox?.classList.remove('fade-out')
  }

  // Loading, failure, completed use .show class for visibility
  actions.loading?.classList.remove('show')
  actions.failure?.classList.remove('show')
  actions.completed?.classList.remove('show')

  // Change the status text
  statusDefault?.classList.add('hidden')
  statusFailure?.classList.add('hidden')
  statusComputing?.classList.add('hidden')

  if (action === 'failure') {
    statusFailure?.classList.remove('hidden')
    updateProgressBar(0) // Hide progress bar on failure
  } else if (action === 'loading') {
    statusComputing?.classList.remove('hidden')
    updateProgressBar(-1) // Start with indeterminate progress
  } else if (action === 'completed') {
    statusDefault?.classList.remove('hidden')
    updateProgressBar(100) // Complete the progress bar
  } else {
    statusDefault?.classList.remove('hidden')
    updateProgressBar(0) // Hide progress bar
  }

  // Show the active action element with animation
  if (action !== ACTION.checkbox) {
    // Small delay to ensure CSS transitions work properly
    requestAnimationFrame(() => {
      actions[action]?.classList.add('show')
    })
  }

  // Update ARIA state
  updateAriaState(action)
}

const setLifetimeTimeout = () => {
  setTimeout(() => {
    sendMessageToLoader(IFRAME_MESSAGE_TYPES.TOKEN_EXPIRED)
    activateAction(ACTION.checkbox)
  }, CAPTCHA_TOKEN_LIFETIME * 1000)
}

const generateChallenge = async (): Promise<PowChallenge | null> => {
  try {
    const response = await fetch(`${API_URL}${ENDPOINTS.GENERATE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // @ts-ignore
        pid: window.__SWETRIX_PROJECT_ID,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to generate challenge')
    }

    return await response.json()
  } catch (reason) {
    logger.error('Failed to generate challenge:', reason)
    sendMessageToLoader(IFRAME_MESSAGE_TYPES.FAILURE)
    activateAction(ACTION.failure)
    return null
  }
}

const verifySolution = async (challenge: string, nonce: number, solution: string): Promise<string | null> => {
  try {
    const response = await fetch(`${API_URL}${ENDPOINTS.VERIFY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        challenge,
        nonce,
        solution,
        // @ts-ignore
        pid: window.__SWETRIX_PROJECT_ID,
      }),
    })

    if (!response.ok) {
      throw new Error('Verification failed')
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error('Verification failed')
    }

    return data.token
  } catch (reason) {
    logger.error('Failed to verify solution:', reason)
    sendMessageToLoader(IFRAME_MESSAGE_TYPES.FAILURE)
    activateAction(ACTION.failure)
    return null
  }
}

/**
 * Calculate estimated progress based on difficulty and attempts
 * Uses a logarithmic scale to provide smooth progress feedback
 */
const calculateProgress = (attempts: number, difficulty: number): number => {
  // Estimate expected iterations based on difficulty
  // For difficulty d, expected iterations is roughly 16^d / 2
  const expectedIterations = Math.pow(16, difficulty) / 2

  // Use a logarithmic scale for smoother progress
  // This ensures progress feels more linear to the user
  const rawProgress = (attempts / expectedIterations) * 100

  // Apply easing to make early progress more visible
  // and slow down as we approach completion
  const easedProgress = Math.min(95, Math.sqrt(rawProgress) * 10)

  return easedProgress
}

const solveChallenge = async (challenge: PowChallenge): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Terminate any existing worker
    if (powWorker) {
      powWorker.terminate()
    }

    try {
      powWorker = new Worker(WORKER_URL)
    } catch (reason) {
      logger.warn('Failed to create worker:', reason)
      // Fallback: solve in main thread if worker fails
      solveInMainThread(challenge).then(resolve).catch(reject)
      return
    }

    powWorker.onmessage = async (
      event: MessageEvent<
        PowResult | PowProgress | { type: 'timeout'; reason: string } | { type: 'error'; message?: string }
      >,
    ) => {
      const data = event.data

      if (data.type === 'progress') {
        // Update progress bar based on attempts
        const progressData = data as PowProgress
        const progress = calculateProgress(progressData.attempts, challenge.difficulty)
        updateProgressBar(progress)
        return
      }

      if (data.type === 'timeout') {
        // Worker timed out or hit max iterations
        logger.error('PoW worker timeout:', (data as { type: 'timeout'; reason: string }).reason)
        sendMessageToLoader(IFRAME_MESSAGE_TYPES.FAILURE)
        activateAction(ACTION.failure)
        powWorker?.terminate()
        powWorker = null
        resolve()
        return
      }

      if (data.type === 'result') {
        // Worker found the solution
        updateProgressBar(100) // Complete progress bar
        const token = await verifySolution(challenge.challenge, (data as PowResult).nonce, (data as PowResult).solution)

        if (token) {
          sendMessageToLoader(IFRAME_MESSAGE_TYPES.SUCCESS, { token })
          setLifetimeTimeout()
          activateAction(ACTION.completed)
        }

        powWorker?.terminate()
        powWorker = null
        resolve()
        return
      }

      // Handle error message from worker
      if (data.type === 'error') {
        const errorData = data as { type: 'error'; message?: string }
        logger.error('PoW worker error message:', errorData.message || 'Unknown error')
        sendMessageToLoader(IFRAME_MESSAGE_TYPES.FAILURE)
        activateAction(ACTION.failure)
        powWorker?.terminate()
        powWorker = null
        resolve()
        return
      }

      // Fallback for unexpected message types
      logger.warn('PoW worker received unexpected message type:', (data as { type?: unknown }).type, 'Raw data:', data)
      sendMessageToLoader(IFRAME_MESSAGE_TYPES.FAILURE)
      activateAction(ACTION.failure)
      powWorker?.terminate()
      powWorker = null
      resolve()
    }

    powWorker.onerror = (error) => {
      logger.error('PoW worker error:', error)
      powWorker?.terminate()
      powWorker = null

      // Fallback to main thread
      solveInMainThread(challenge).then(resolve).catch(reject)
    }

    // Start the worker
    powWorker.postMessage({
      challenge: challenge.challenge,
      difficulty: challenge.difficulty,
    })
  })
}

// Fallback solution for environments where workers don't work
const solveInMainThread = async (challenge: PowChallenge): Promise<void> => {
  const { challenge: challengeStr, difficulty } = challenge
  let nonce = 0
  const startTime = Date.now()
  const progressInterval = 1000 // Update progress every 1k iterations

  const sha256 = async (message: string): Promise<string> => {
    const encoder = new TextEncoder()
    const data = encoder.encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  const hasValidPrefix = (hash: string, diff: number): boolean => {
    for (let i = 0; i < diff; i++) {
      if (hash[i] !== '0') return false
    }
    return true
  }

  while (nonce < MAX_ITERATIONS) {
    // Check overall timeout
    const elapsedMs = Date.now() - startTime
    if (elapsedMs >= TIMEOUT_MS) {
      logger.error(`PoW main-thread timeout: ${TIMEOUT_MS}ms elapsed after ${nonce} attempts`)
      sendMessageToLoader(IFRAME_MESSAGE_TYPES.FAILURE)
      activateAction(ACTION.failure)
      return
    }

    const input = `${challengeStr}:${nonce}`
    const hash = await sha256(input)

    if (hasValidPrefix(hash, difficulty)) {
      updateProgressBar(100) // Complete progress bar
      const token = await verifySolution(challengeStr, nonce, hash)

      if (token) {
        sendMessageToLoader(IFRAME_MESSAGE_TYPES.SUCCESS, { token })
        setLifetimeTimeout()
        activateAction(ACTION.completed)
      }
      return
    }

    nonce++

    // Update progress bar periodically
    if (nonce % progressInterval === 0) {
      const progress = calculateProgress(nonce, difficulty)
      updateProgressBar(progress)
    }
  }

  // Max iterations reached without finding solution
  logger.error(`PoW main-thread max iterations reached: ${MAX_ITERATIONS} attempts`)
  sendMessageToLoader(IFRAME_MESSAGE_TYPES.FAILURE)
  activateAction(ACTION.failure)
}

/**
 * Handles the captcha activation (click or keyboard)
 */
const handleCaptchaActivation = async () => {
  if (activeAction === ACTION.loading || activeAction === ACTION.completed) {
    return
  }

  if (activeAction === ACTION.failure) {
    activateAction(ACTION.checkbox)
    return
  }

  activateAction(ACTION.loading)

  const challenge = await generateChallenge()

  if (!challenge) {
    return
  }

  await solveChallenge(challenge)
}

const applyTranslations = () => {
  const statusDefault = document.querySelector('#status-default')
  const statusFailure = document.querySelector('#status-failure')
  const statusComputing = document.querySelector('#status-computing span')
  const progressBarContainer = document.querySelector('#progress-bar-container')

  if (statusDefault) statusDefault.textContent = t.iAmHuman
  if (statusFailure) statusFailure.textContent = t.verificationFailed
  if (statusComputing) statusComputing.textContent = t.verifying
  if (progressBarContainer) progressBarContainer.setAttribute('aria-label', t.ariaProgress)

  document.documentElement.lang = currentLocale
}

document.addEventListener('DOMContentLoaded', () => {
  const captchaComponent = document.querySelector('#swetrix-captcha')
  const branding = document.querySelector('#branding')

  applyTranslations()

  branding?.addEventListener('click', (e: Event) => {
    e.stopPropagation()
  })

  captchaComponent?.addEventListener('click', handleCaptchaActivation)

  captchaComponent?.addEventListener('keydown', (e: Event) => {
    const keyboardEvent = e as KeyboardEvent

    if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
      e.preventDefault()
      handleCaptchaActivation()
    }
  })

  captchaComponent?.addEventListener('keyup', (e: Event) => {
    const keyboardEvent = e as KeyboardEvent
    if (keyboardEvent.key === ' ') {
      e.preventDefault()
    }
  })

  updateAriaState(ACTION.checkbox)
})
