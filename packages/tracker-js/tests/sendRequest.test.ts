/// <reference types="jest" />

import { Lib } from '../src/Lib'
import { setLocation } from './testUtils'

const PROJECT_ID = 'test-project-id'

describe('sendRequest keepalive', () => {
  let fetchMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    setLocation({ hostname: 'example.com', pathname: '/test-page' })

    fetchMock = jest.fn().mockResolvedValue({ ok: true })
    Object.defineProperty(globalThis, 'fetch', {
      value: fetchMock,
      writable: true,
      configurable: true,
    })
  })

  test('track() sends events with keepalive so they survive page unloads', async () => {
    const lib = new Lib(PROJECT_ID, { devMode: true })

    await lib.track({ ev: 'outbound_link_click' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, options] = fetchMock.mock.calls[0]
    expect(options.keepalive).toBe(true)
  })

  test('oversized payloads fall back to a regular request', async () => {
    const lib = new Lib(PROJECT_ID, { devMode: true })

    await lib.track({
      ev: 'big_event',
      meta: { blob: 'x'.repeat(70_000) },
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, options] = fetchMock.mock.calls[0]
    expect(options.keepalive).toBe(false)
  })
})
