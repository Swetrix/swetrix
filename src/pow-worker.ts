export {}

// PoW Worker - Computes the proof-of-work solution in a background thread

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

type PowMessage = PowResult | PowProgress

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
async function solveChallenge(challenge: string, difficulty: number): Promise<void> {
  let nonce = 0
  const startTime = Date.now()
  const progressInterval = 10000 // Report progress every 10k attempts

  while (true) {
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
      const elapsed = (Date.now() - startTime) / 1000
      const hashRate = Math.round(nonce / elapsed)
      const progress: PowProgress = {
        type: 'progress',
        attempts: nonce,
        hashRate,
      }
      self.postMessage(progress)
    }
  }
}

// Listen for messages from the main thread
self.onmessage = async (event: MessageEvent<PowChallenge>) => {
  const { challenge, difficulty } = event.data
  await solveChallenge(challenge, difficulty)
}

