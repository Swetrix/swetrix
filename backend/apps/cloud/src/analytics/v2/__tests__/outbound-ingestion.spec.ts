import { AnalyticsController } from '../../analytics.controller'
import { EventsDto } from '../../dto/events.dto'
import { OutboundDto } from '../../dto/outbound.dto'
import { clickhouse } from '../../../common/integrations/clickhouse'

jest.mock('../../../common/integrations/clickhouse', () => ({
  clickhouse: { insert: jest.fn().mockResolvedValue(undefined) },
}))
jest.mock('../../../common/utils', () => ({
  deriveKey: () => 'test-secret',
  getIPFromHeaders: () => '192.0.2.1',
  getIPDetails: () => ({ country: 'GB' }),
}))

describe('Outbound ingestion', () => {
  let controller: AnalyticsController
  let analytics: Record<string, jest.Mock>
  let exposures: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    analytics = {
      checkBot: jest.fn().mockResolvedValue({ isBot: false }),
      validate: jest.fn().mockResolvedValue({}),
      checkCountryBlacklist: jest.fn(),
      getRequestInformation: jest
        .fn()
        .mockResolvedValue({ browserName: 'Firefox' }),
      generateAndStoreSessionId: jest
        .fn()
        .mockResolvedValue([true, '123', '456']),
      generateProfileId: jest.fn().mockResolvedValue('profile'),
      recordSessionActivity: jest.fn(),
      getHostFromOrigin: jest.fn().mockReturnValue('example.org'),
    }
    exposures = jest.fn()
    controller = Object.assign(Object.create(AnalyticsController.prototype), {
      analyticsService: analytics,
      logger: { log: jest.fn(), error: jest.fn() },
      trackCustomEventExperimentExposures: exposures,
    })
  })

  it('stores one native event with context without custom-event exposure', async () => {
    await controller.logOutbound(
      {
        pid: 'testproject1',
        url: 'https://tickets.example.org',
        pg: '/article',
        title: 'Article',
      } as OutboundDto,
      { origin: 'https://example.org' },
      '',
    )
    expect(clickhouse.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        values: [
          expect.objectContaining({
            type: 'outbound',
            outbound_url: 'https://tickets.example.org',
            title: 'Article',
            pg: '/article',
            host: 'example.org',
            psid: '123',
            sid: '456',
          }),
        ],
      }),
    )
    expect(exposures).not.toHaveBeenCalled()
    expect(analytics.recordSessionActivity).toHaveBeenCalled()
  })

  it('does not let an extra URL field change a custom event into outbound', async () => {
    await controller.logCustom(
      {
        pid: 'testproject1',
        ev: 'signup',
        url: 'javascript:alert(1)',
      } as unknown as EventsDto,
      {},
      '',
    )
    expect(clickhouse.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        values: [
          expect.objectContaining({
            type: 'custom_event',
            event_name: 'signup',
          }),
        ],
      }),
    )
    expect(exposures).toHaveBeenCalledWith(
      'testproject1',
      'signup',
      'profile',
      expect.any(String),
    )
  })

  it('applies bot and project validation to outbound clicks', async () => {
    analytics.checkBot.mockResolvedValueOnce({ isBot: true })
    await controller.logOutbound(
      { pid: 'testproject1', url: 'https://example.org' } as OutboundDto,
      {},
      '',
    )
    expect(clickhouse.insert).not.toHaveBeenCalled()
    analytics.validate.mockRejectedValueOnce(new Error('Project disabled'))
    await expect(
      controller.logOutbound(
        { pid: 'testproject1', url: 'https://example.org' } as OutboundDto,
        {},
        '',
      ),
    ).rejects.toThrow('Project disabled')
    expect(clickhouse.insert).not.toHaveBeenCalled()
  })
})
