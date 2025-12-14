/**
 * Bayesian A/B Testing Statistics
 *
 * Uses Beta distribution and Monte Carlo simulation to calculate
 * the probability of each variant being the best.
 */

interface VariantData {
  key: string
  exposures: number
  conversions: number
}

type RandomFn = () => number

/**
 * Deterministic (seeded) PRNG: mulberry32
 * Returns a function that generates numbers in [0, 1).
 */
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
    .map(v => `${v.key}:${v.exposures}:${v.conversions}`)
    .join('|')
  // Mix in simulations so changing it changes output deterministically.
  return (fnv1a32(normalized) ^ (simulations >>> 0)) >>> 0
}

/**
 * Beta distribution sampling using the Box-Muller transform
 * and the relationship between Beta and Gamma distributions.
 *
 * For Beta(alpha, beta), we can sample using:
 * X ~ Gamma(alpha, 1), Y ~ Gamma(beta, 1)
 * Then X / (X + Y) ~ Beta(alpha, beta)
 */
function sampleGamma(shape: number, random: RandomFn): number {
  // For shape >= 1, use Marsaglia and Tsang's method
  if (shape >= 1) {
    const d = shape - 1 / 3
    const c = 1 / Math.sqrt(9 * d)

    while (true) {
      let x: number
      let v: number

      do {
        // Generate standard normal using Box-Muller
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

  // For shape < 1, use the transformation:
  // If X ~ Gamma(shape + 1, 1), then X * U^(1/shape) ~ Gamma(shape, 1)
  // where U ~ Uniform(0, 1)
  const sample = sampleGamma(shape + 1, random)
  const u = random()
  return sample * Math.pow(u, 1 / shape)
}

/**
 * Sample from a Beta distribution
 *
 * @param alpha - First shape parameter (successes + 1)
 * @param beta - Second shape parameter (failures + 1)
 * @returns A sample from Beta(alpha, beta)
 */
function sampleBeta(alpha: number, beta: number, random: RandomFn): number {
  const x = sampleGamma(alpha, random)
  const y = sampleGamma(beta, random)
  return x / (x + y)
}

/**
 * Calculate Bayesian probabilities for each variant being the best
 *
 * Uses Monte Carlo simulation with Beta distributions:
 * - For each variant: Beta(conversions + 1, exposures - conversions + 1)
 * - This represents our posterior belief about the true conversion rate
 * - The +1 terms come from using a uniform prior Beta(1, 1)
 *
 * @param variants - Array of variant data with exposures and conversions
 * @param simulations - Number of Monte Carlo simulations (default: 10000)
 * @returns Map of variant key to probability of being best
 */
export function calculateBayesianProbabilities(
  variants: VariantData[],
  simulations: number = 10000,
): Map<string, number> {
  if (variants.length === 0) {
    return new Map()
  }

  if (variants.length === 1) {
    return new Map([[variants[0].key, 1]])
  }

  // Check if we have any data at all
  const totalExposures = variants.reduce((sum, v) => sum + v.exposures, 0)
  if (totalExposures === 0) {
    // No data yet - equal probability for all variants
    const prob = 1 / variants.length
    return new Map(variants.map(v => [v.key, prob]))
  }

  // Count wins for each variant
  const wins = new Map<string, number>()
  for (const v of variants) {
    wins.set(v.key, 0)
  }

  // Use deterministic PRNG so the same input always produces the same output.
  // This prevents slight "drift" between the table value and the last chart point.
  const random = mulberry32(seedFromVariants(variants, simulations))

  // Run Monte Carlo simulation
  for (let i = 0; i < simulations; i++) {
    let bestRate = -1
    let bestKey = ''

    for (const variant of variants) {
      // Calculate Beta distribution parameters
      // alpha = conversions + 1 (prior success)
      // beta = exposures - conversions + 1 (prior failure)
      const alpha = variant.conversions + 1
      const beta = Math.max(1, variant.exposures - variant.conversions + 1)

      // Sample from the Beta distribution
      const rate = sampleBeta(alpha, beta, random)

      if (rate > bestRate) {
        bestRate = rate
        bestKey = variant.key
      }
    }

    // Increment win count for the best variant in this simulation
    wins.set(bestKey, (wins.get(bestKey) || 0) + 1)
  }

  // Convert wins to probabilities
  const probabilities = new Map<string, number>()
  for (const [key, winCount] of wins) {
    probabilities.set(key, winCount / simulations)
  }

  return probabilities
}
