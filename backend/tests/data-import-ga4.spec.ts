import * as crypto from 'crypto'

const runReport = jest.fn()
jest.mock('@google-analytics/data', () => ({
  BetaAnalyticsDataClient: jest.fn(() => ({ runReport })),
}))
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn(() => ({ setCredentials: jest.fn() })),
}))

for (const edition of ['cloud', 'community']) {
  describe(`${edition} GA4 import`, () => {
    jest.doMock(`../apps/${edition}/src/common/utils`, () => ({
      deriveKey: () => '00'.repeat(32),
    }))
    const { Ga4Mapper } = require(
      `../apps/${edition}/src/data-import/mappers/ga4.mapper`,
    )
    it('maps paged API reports and preserves pageview and custom-event counts', async () => {
      runReport.mockReset()
      runReport.mockImplementation(async ({ dimensions, metrics }) => {
        const values: Record<string, string> = {
          dateHour: '2024010112',
          hostName: 'example.com',
          pagePath: '/',
          deviceCategory: 'desktop',
          browser: 'Chrome',
          operatingSystem: 'Linux',
          countryId: 'GB',
          eventName: 'Signup',
          sessionSource: 'google',
          sessionMedium: 'organic',
        }
        return [
          {
            rows: [
              {
                dimensionValues: dimensions.map(({ name }) => ({
                  value: values[name] || '(not set)',
                })),
                metricValues: [
                  { value: metrics[0].name === 'eventCount' ? '2' : '3' },
                ],
              },
            ],
          },
        ]
      })
      const iv = Buffer.alloc(12)
      const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.alloc(32), iv)
      const encrypted = Buffer.concat([
        cipher.update('refresh-token'),
        cipher.final(),
      ])
      const token = `${iv.toString('hex')}:${encrypted.toString('hex')}:${cipher.getAuthTag().toString('hex')}`
      const rows = []
      for await (const row of new Ga4Mapper().createRowStream(
        null,
        'testproject1',
        1,
        {
          encryptedRefreshToken: token,
          ga4PropertyId: '123',
          ga4ClientId: 'client',
          ga4ClientSecret: 'secret',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        },
      ))
        rows.push(row)
      expect(rows.filter((row) => row.type === 'pageview')).toHaveLength(3)
      expect(rows.filter((row) => row.type === 'custom_event')).toHaveLength(2)
      expect(
        rows.every((row) => row.data.created === '2024-01-01 12:00:00'),
      ).toBe(true)
      expect(runReport).toHaveBeenCalledTimes(3)
    })
  })
}
