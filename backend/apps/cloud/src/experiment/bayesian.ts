/**
 * Bayesian A/B Testing Statistics
 *
 * Uses Beta distribution and Monte Carlo simulation to calculate
 * the probability of each variant being the best.
 */

export interface VariantData {
  key: string
  exposures: number
  conversions: number
}

/**
 * Beta distribution sampling using the Box-Muller transform
 * and the relationship between Beta and Gamma distributions.
 *
 * For Beta(alpha, beta), we can sample using:
 * X ~ Gamma(alpha, 1), Y ~ Gamma(beta, 1)
 * Then X / (X + Y) ~ Beta(alpha, beta)
 */
function sampleGamma(shape: number): number {
  // For shape >= 1, use Marsaglia and Tsang's method
  if (shape >= 1) {
    const d = shape - 1 / 3
    const c = 1 / Math.sqrt(9 * d)

    while (true) {
      let x: number
      let v: number

      do {
        // Generate standard normal using Box-Muller
        const u1 = Math.random()
        const u2 = Math.random()
        x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
        v = 1 + c * x
      } while (v <= 0)

      v = v * v * v
      const u = Math.random()

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
  const sample = sampleGamma(shape + 1)
  const u = Math.random()
  return sample * Math.pow(u, 1 / shape)
}

/**
 * Sample from a Beta distribution
 *
 * @param alpha - First shape parameter (successes + 1)
 * @param beta - Second shape parameter (failures + 1)
 * @returns A sample from Beta(alpha, beta)
 */
function sampleBeta(alpha: number, beta: number): number {
  const x = sampleGamma(alpha)
  const y = sampleGamma(beta)
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
      const rate = sampleBeta(alpha, beta)

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

/**
 * Calculate credible interval for a variant's conversion rate
 *
 * @param conversions - Number of conversions
 * @param exposures - Number of exposures
 * @param credibleLevel - Credible level (default: 0.95 for 95%)
 * @returns [lower, upper] bounds of the credible interval
 */
export function calculateCredibleInterval(
  conversions: number,
  exposures: number,
  credibleLevel: number = 0.95,
): [number, number] {
  if (exposures === 0) {
    return [0, 1]
  }

  const alpha = conversions + 1
  const beta = exposures - conversions + 1

  // Use numerical approximation for Beta distribution quantiles
  // Sample many times and find percentiles
  const samples: number[] = []
  for (let i = 0; i < 10000; i++) {
    samples.push(sampleBeta(alpha, beta))
  }
  samples.sort((a, b) => a - b)

  const lowerIdx = Math.floor(((1 - credibleLevel) / 2) * samples.length)
  const upperIdx = Math.floor(((1 + credibleLevel) / 2) * samples.length) - 1

  return [samples[lowerIdx], samples[upperIdx]]
}

/**
 * Calculate the expected lift of test variant over control
 *
 * @param controlConversions - Control variant conversions
 * @param controlExposures - Control variant exposures
 * @param testConversions - Test variant conversions
 * @param testExposures - Test variant exposures
 * @param simulations - Number of Monte Carlo simulations
 * @returns Expected relative improvement (e.g., 0.15 for 15% improvement)
 */
export function calculateExpectedLift(
  controlConversions: number,
  controlExposures: number,
  testConversions: number,
  testExposures: number,
  simulations: number = 10000,
): number {
  if (controlExposures === 0 || testExposures === 0) {
    return 0
  }

  const controlAlpha = controlConversions + 1
  const controlBeta = controlExposures - controlConversions + 1
  const testAlpha = testConversions + 1
  const testBeta = testExposures - testConversions + 1

  let totalLift = 0

  for (let i = 0; i < simulations; i++) {
    const controlRate = sampleBeta(controlAlpha, controlBeta)
    const testRate = sampleBeta(testAlpha, testBeta)

    if (controlRate > 0) {
      totalLift += (testRate - controlRate) / controlRate
    }
  }

  return totalLift / simulations
}
