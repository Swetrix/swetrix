import { AppLoggerService } from '../logger/logger.service'
import { IndexNowService } from './indexnow.service'

const ORIGINAL_KEY = process.env.INDEXNOW_KEY

describe('IndexNowService', () => {
  const logger = {
    log: jest.fn(),
    warn: jest.fn(),
  } as unknown as AppLoggerService
  const service = new IndexNowService(logger)

  beforeEach(() => {
    process.env.INDEXNOW_KEY = 'indexnow-test-key'
    jest.clearAllMocks()
  })

  afterAll(() => {
    if (ORIGINAL_KEY === undefined) {
      delete process.env.INDEXNOW_KEY
    } else {
      process.env.INDEXNOW_KEY = ORIGINAL_KEY
    }
  })

  it('submits unique URLs with the root key location', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(null, {
        status: 202,
      }),
    )

    await expect(
      service.submit([
        'https://swetrix.com/blog/new-post',
        'https://swetrix.com/blog/new-post',
        'https://swetrix.com/blog/updated-post',
      ]),
    ).resolves.toBe(true)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.indexnow.org/indexnow',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          host: 'swetrix.com',
          key: 'indexnow-test-key',
          keyLocation: 'https://swetrix.com/indexnow-test-key.txt',
          urlList: [
            'https://swetrix.com/blog/new-post',
            'https://swetrix.com/blog/updated-post',
          ],
        }),
      }),
    )

    fetchMock.mockRestore()
  })

  it('does nothing when the key is not configured', async () => {
    delete process.env.INDEXNOW_KEY
    const fetchMock = jest.spyOn(global, 'fetch')

    await expect(
      service.submit(['https://swetrix.com/blog/new-post']),
    ).resolves.toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()

    fetchMock.mockRestore()
  })

  it('rejects URLs from different hosts', async () => {
    await expect(
      service.submit([
        'https://swetrix.com/blog/new-post',
        'https://example.com/blog/new-post',
      ]),
    ).rejects.toThrow('IndexNow URLs must use HTTP(S) and share one host')
  })
})
