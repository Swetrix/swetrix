export {}

// @ts-ignore
const isDevelopment = true // window.__SWETRIX_CAPTCHA_DEV || false

const API_URL = isDevelopment ? 'http://localhost:5005/v1/captcha' : 'https://api.swetrix.com/v1/captcha'
const WORKER_URL = isDevelopment ? './pow-worker.js' : 'https://cap.swetrix.com/pow-worker.js'
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
  } else if (action === 'loading') {
    statusComputing?.classList.remove('hidden')
  } else {
    statusDefault?.classList.remove('hidden')
  }

  // Show the active action element with animation
  if (action !== ACTION.checkbox) {
    // Small delay to ensure CSS transitions work properly
    requestAnimationFrame(() => {
      actions[action]?.classList.add('show')
    })
  }
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
  } catch (e) {
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
  } catch (e) {
    sendMessageToLoader(IFRAME_MESSAGE_TYPES.FAILURE)
    activateAction(ACTION.failure)
    return null
  }
}

const solveChallenge = async (challenge: PowChallenge): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Terminate any existing worker
    if (powWorker) {
      powWorker.terminate()
    }

    try {
      powWorker = new Worker(WORKER_URL)
    } catch (e) {
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
        return
      }

      if (data.type === 'timeout') {
        // Worker timed out or hit max iterations
        console.error('PoW worker timeout:', (data as { type: 'timeout'; reason: string }).reason)
        sendMessageToLoader(IFRAME_MESSAGE_TYPES.FAILURE)
        activateAction(ACTION.failure)
        powWorker?.terminate()
        powWorker = null
        resolve()
        return
      }

      if (data.type === 'result') {
        // Worker found the solution
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
        console.error('PoW worker error message:', errorData.message || 'Unknown error')
        sendMessageToLoader(IFRAME_MESSAGE_TYPES.FAILURE)
        activateAction(ACTION.failure)
        powWorker?.terminate()
        powWorker = null
        resolve()
        return
      }

      // Fallback for unexpected message types
      console.warn('PoW worker received unexpected message type:', (data as { type?: unknown }).type, 'Raw data:', data)
      sendMessageToLoader(IFRAME_MESSAGE_TYPES.FAILURE)
      activateAction(ACTION.failure)
      powWorker?.terminate()
      powWorker = null
      resolve()
    }

    powWorker.onerror = (error) => {
      console.error('PoW worker error:', error)
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
      console.error(`PoW main-thread timeout: ${TIMEOUT_MS}ms elapsed after ${nonce} attempts`)
      sendMessageToLoader(IFRAME_MESSAGE_TYPES.FAILURE)
      activateAction(ACTION.failure)
      return
    }

    const input = `${challengeStr}:${nonce}`
    const hash = await sha256(input)

    if (hasValidPrefix(hash, difficulty)) {
      const token = await verifySolution(challengeStr, nonce, hash)

      if (token) {
        sendMessageToLoader(IFRAME_MESSAGE_TYPES.SUCCESS, { token })
        setLifetimeTimeout()
        activateAction(ACTION.completed)
      }
      return
    }

    nonce++
  }

  // Max iterations reached without finding solution
  console.error(`PoW main-thread max iterations reached: ${MAX_ITERATIONS} attempts`)
  sendMessageToLoader(IFRAME_MESSAGE_TYPES.FAILURE)
  activateAction(ACTION.failure)
}

document.addEventListener('DOMContentLoaded', () => {
  const captchaComponent = document.querySelector('#swetrix-captcha')
  const branding = document.querySelector('#branding')

  branding?.addEventListener('click', (e: Event) => {
    e.stopPropagation()
  })

  captchaComponent?.addEventListener('click', async () => {
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
  })
})
