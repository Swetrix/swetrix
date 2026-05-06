interface VariantData {
  key: string
  exposures: number
  conversions: number
}

type RandomFn = () => number

function mulberry32(seed: number): RandomFn {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function fnv1a32(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function seedFromVariants(
  variants: VariantData[],
  simulations: number,
): number {
  const normalized = [...variants]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((v) => `${v.key}:${v.exposures}:${v.conversions}`)
    .join('|')
  return (fnv1a32(normalized) ^ (simulations >>> 0)) >>> 0
}

function sampleGamma(shape: number, random: RandomFn): number {
  if (shape < 1) {
    throw new RangeError('sampleGamma expects shape >= 1')
  }

  const d = shape - 1 / 3
  const c = 1 / Math.sqrt(9 * d)

  while (true) {
    let x: number
    let v: number

    do {
      const u1 = Math.max(random(), Number.EPSILON)
      const u2 = random()
      x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      v = 1 + c * x
    } while (v <= 0)

    v = v * v * v
    const u = random()

    if (u < 1 - 0.0331 * x * x * x * x) {
      return d * v
    }

    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v
    }
  }
}

function sampleBeta(alpha: number, beta: number, random: RandomFn): number {
  const x = sampleGamma(alpha, random)
  const y = sampleGamma(beta, random)
  return x / (x + y)
}

export function calculateBayesianProbabilities(
  variants: VariantData[],
  simulations: number = 10000,
): Map<string, number> {
  if (variants.length === 0) {
    return new Map()
  }

  simulations = Math.max(1, Math.floor(simulations))

  const sanitizedVariants = variants.map((variant) => {
    const exposures = Math.max(0, Math.floor(variant.exposures))
    const conversions = Math.min(
      Math.max(0, Math.floor(variant.conversions)),
      exposures,
    )
    return { key: variant.key, exposures, conversions }
  })

  if (sanitizedVariants.length === 1) {
    return new Map([[sanitizedVariants[0].key, 1]])
  }

  const totalExposures = sanitizedVariants.reduce(
    (sum, variant) => sum + variant.exposures,
    0,
  )
  if (totalExposures === 0) {
    const probability = 1 / sanitizedVariants.length
    return new Map(
      sanitizedVariants.map((variant) => [variant.key, probability]),
    )
  }

  const wins = new Map<string, number>()
  for (const variant of sanitizedVariants) {
    wins.set(variant.key, 0)
  }

  const random = mulberry32(seedFromVariants(sanitizedVariants, simulations))

  for (let i = 0; i < simulations; i++) {
    let bestRate = -1
    let bestKey = ''

    for (const variant of sanitizedVariants) {
      const alpha = variant.conversions + 1
      const beta = Math.max(1, variant.exposures - variant.conversions + 1)
      const rate = sampleBeta(alpha, beta, random)

      if (rate > bestRate) {
        bestRate = rate
        bestKey = variant.key
      }
    }

    wins.set(bestKey, (wins.get(bestKey) || 0) + 1)
  }

  const probabilities = new Map<string, number>()
  for (const [key, winCount] of wins) {
    probabilities.set(key, winCount / simulations)
  }

  return probabilities
}
