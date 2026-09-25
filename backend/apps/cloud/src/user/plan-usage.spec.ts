import { evaluatePlanUsage } from './plan-usage'

describe('plan usage tolerance', () => {
  it.each([
    [200000, 200000, false, false],
    [200001, 200001, false, false],
    [220000, 220000, false, false],
    [220001, 220000, false, false],
    [220000, 220001, false, false],
    [220001, 220001, true, false],
    [260000, 0, false, false],
    [260001, 0, true, true],
    [260001, 260001, true, true],
    [0, 300000, false, false],
  ])(
    'evaluates current %i / previous %i',
    (current, previous, exceedsLimit, hitPercentageLimit) => {
      expect(evaluatePlanUsage(200000, current, previous)).toMatchObject({
        exceedsLimit,
        hitPercentageLimit,
      })
    },
  )
})
