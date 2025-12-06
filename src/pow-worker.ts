export {}

// PoW Worker - Computes the proof-of-work solution in a background thread

// Maximum allowed difficulty to prevent excessive computation
const MAX_DIFFICULTY = 32

// Default maximum iterations to prevent infinite loops (100 million)
const DEFAULT_MAX_ITERATIONS = 100_000_000

interface PowChallenge {
  challenge: string
  difficulty: number
  maxIterations?: number // Optional: maximum iterations before timeout (default: 100 million)
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

interface PowTimeout {
  type: 'timeout'
  reason: string
  attempts: number
  elapsedMs: number
  hashRate: number
}

interface PowError {
  type: 'error'
  message: string
}

type PowMessage = PowResult | PowProgress | PowTimeout | PowError

// SHA-256 implementation using SubtleCrypto
async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Check if hash has required number of leading zeros
function hasValidPrefix(hash: string, difficulty: number): boolean {
  for (let i = 0; i < difficulty; i++) {
    if (hash[i] !== '0') {
      return false
    }
  }
  return true
}

// Solve the PoW challenge
async function solveChallenge(challenge: string, difficulty: number, maxIterations: number): Promise<void> {
  let nonce = 0
  const startTime = Date.now()
  const progressInterval = 10000 // Report progress every 10k attempts

  while (nonce < maxIterations) {
    const input = `${challenge}:${nonce}`
    const hash = await sha256(input)

    if (hasValidPrefix(hash, difficulty)) {
      // Found the solution!
      const result: PowResult = {
        type: 'result',
        nonce,
        solution: hash,
      }
      self.postMessage(result)
      return
    }

    nonce++

    // Report progress periodically
    if (nonce % progressInterval === 0) {
      const elapsedMs = Date.now() - startTime
      const elapsed = elapsedMs / 1000
      const hashRate = Math.round(nonce / elapsed)
      const progress: PowProgress = {
        type: 'progress',
        attempts: nonce,
        hashRate,
      }
      self.postMessage(progress)
    }
  }

  // Max iterations reached - send timeout message
  const elapsedMs = Date.now() - startTime
  const elapsed = elapsedMs / 1000
  const hashRate = elapsed > 0 ? Math.round(nonce / elapsed) : 0
  const timeout: PowTimeout = {
    type: 'timeout',
    reason: `Maximum iterations reached (${maxIterations.toLocaleString()})`,
    attempts: nonce,
    elapsedMs,
    hashRate,
  }
  self.postMessage(timeout)
}

// Listen for messages from the main thread
self.onmessage = async (event: MessageEvent<PowChallenge>) => {
  // Validate event.data exists
  if (!event.data) {
    const error: PowError = {
      type: 'error',
      message: 'Invalid message: event.data is missing or empty',
    }
    self.postMessage(error)
    return
  }

  const { challenge, difficulty, maxIterations } = event.data

  // Validate challenge is provided and is a non-empty string
  if (typeof challenge !== 'string' || challenge.length === 0) {
    const error: PowError = {
      type: 'error',
      message: 'Invalid message: challenge must be a non-empty string',
    }
    self.postMessage(error)
    return
  }

  // Validate difficulty is a positive integer within acceptable range
  if (typeof difficulty !== 'number' || !Number.isInteger(difficulty)) {
    const error: PowError = {
      type: 'error',
      message: 'Invalid message: difficulty must be an integer',
    }
    self.postMessage(error)
    return
  }

  if (difficulty < 1 || difficulty > MAX_DIFFICULTY) {
    const error: PowError = {
      type: 'error',
      message: `Invalid message: difficulty must be between 1 and ${MAX_DIFFICULTY}`,
    }
    self.postMessage(error)
    return
  }

  // Validate maxIterations if provided
  const effectiveMaxIterations = maxIterations ?? DEFAULT_MAX_ITERATIONS
  if (typeof effectiveMaxIterations !== 'number' || !Number.isInteger(effectiveMaxIterations)) {
    const error: PowError = {
      type: 'error',
      message: 'Invalid message: maxIterations must be an integer',
    }
    self.postMessage(error)
    return
  }

  if (effectiveMaxIterations < 1) {
    const error: PowError = {
      type: 'error',
      message: 'Invalid message: maxIterations must be at least 1',
    }
    self.postMessage(error)
    return
  }

  await solveChallenge(challenge, difficulty, effectiveMaxIterations)
}
