import { Lib, LibOptions } from '../src/Lib'
import { setLocation } from './testUtils'

describe('Outbound link capture', () => {
  let instances: Lib[]
  let request: jest.SpyInstance

  const create = (options: LibOptions = {}) => {
    const lib = new Lib('testproject1', { devMode: true, ...options })
    instances.push(lib)
    return lib
  }

  const click = (href: string, options: MouseEventInit = {}, type = 'click') => {
    const link = document.createElement('a')
    link.href = href
    link.innerHTML = '<span>Tickets</span>'
    link.addEventListener(type, (event) => event.preventDefault())
    document.body.appendChild(link)
    link.firstElementChild!.dispatchEvent(
      new MouseEvent(type, { bubbles: true, cancelable: true, composed: true, ...options }),
    )
    return link
  }

  beforeEach(() => {
    instances = []
    setLocation({ hostname: 'example.com', pathname: '/article' })
    request = jest.spyOn(Lib.prototype as any, 'sendRequest').mockResolvedValue(undefined)
  })

  afterEach(() => {
    instances.forEach((lib) => lib.stopAutoCapture())
    document.body.innerHTML = ''
    jest.restoreAllMocks()
  })

  it.each([undefined, false])('is disabled when outboundLinks is %s', (outboundLinks) => {
    create({ events: { outboundLinks } })
    click('https://tickets.example.org/event')
    expect(request).not.toHaveBeenCalled()
  })

  it('captures a dynamically inserted nested link with page context and safe URL defaults', () => {
    create({ events: { outboundLinks: true }, profileId: 'reader' })
    click('https://user:password@tickets.example.org/event?token=secret#section')
    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith(
      'outbound',
      expect.objectContaining({
        pid: 'testproject1',
        pg: '/article',
        profileId: 'reader',
        url: 'https://tickets.example.org/event',
      }),
    )
  })

  it.each([
    ['', undefined],
    ['?q=short', 'q=short'],
    [`?${'x'.repeat(2048)}`, 'x'.repeat(2048)],
    [`?${'x'.repeat(2049)}`, 'x'.repeat(2048)],
  ])('limits the source query string (%#)', (search, qs) => {
    setLocation({ search })
    create({ events: { outboundLinks: true } })
    click('https://tickets.example.org/event')
    expect(request).toHaveBeenCalledWith('outbound', expect.objectContaining({ qs }))
  })

  it('preserves campaign fields beyond the query string limit', () => {
    setLocation({ search: `?q=${'x'.repeat(2048)}&utm_source=newsletter&utm_campaign=launch` })
    create({ events: { outboundLinks: true } })
    click('https://tickets.example.org/event')
    expect(request).toHaveBeenCalledWith(
      'outbound',
      expect.objectContaining({ qs: `q=${'x'.repeat(2046)}`, so: 'newsletter', ca: 'launch' }),
    )
  })

  it.each([
    '/inside',
    '#section',
    'https://example.com/inside',
    'https://www.example.com/inside',
    'mailto:hello@example.org',
    'tel:123',
    'javascript:void(0)',
    'https://[invalid',
  ])('ignores %s', (href) => {
    create({ events: { outboundLinks: true } })
    click(href)
    expect(request).not.toHaveBeenCalled()
  })

  it('supports explicit destination URL options and hostname exclusions', () => {
    create({ events: { outboundLinks: { search: true, hash: true, ignoreDomains: ['APP.EXAMPLE.COM'] } } })
    click('https://www.app.example.com/start')
    expect(request).not.toHaveBeenCalled()
    click('https://tickets.example.org/event?id=4#seat')
    expect(request).toHaveBeenCalledWith(
      'outbound',
      expect.objectContaining({ url: 'https://tickets.example.org/event?id=4#seat' }),
    )
  })

  it('handles modified and middle clicks once and ignores right clicks', () => {
    create({ events: { outboundLinks: true } })
    click('https://tickets.example.org/event', { ctrlKey: true })
    click('https://tickets.example.org/event', { button: 1 }, 'auxclick')
    click('https://tickets.example.org/event', { button: 2 }, 'auxclick')
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('respects ignored links and ancestor containers', () => {
    create({ events: { outboundLinks: true } })
    document.body.innerHTML = '<div data-swetrix-ignore><a href="https://example.org"><span>Ignore</span></a></div>'
    document.querySelector('span')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(request).not.toHaveBeenCalled()
  })

  it('captures links inside an open shadow root', () => {
    create({ events: { outboundLinks: true } })
    const host = document.createElement('div')
    document.body.appendChild(host)
    const shadow = host.attachShadow({ mode: 'open' })
    shadow.innerHTML = '<a href="https://example.org"><span>Tickets</span></a>'
    shadow.querySelector('span')!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('stops listeners without stopping manual custom events', async () => {
    const lib = create({ events: { outboundLinks: true } })
    lib.stopAutoCapture()
    lib.stopAutoCapture()
    click('https://example.org')
    expect(request).not.toHaveBeenCalled()
    await lib.track({ ev: 'signup' })
    expect(request).toHaveBeenCalledWith('custom', expect.objectContaining({ ev: 'signup' }))
  })

  it('respects disabled tracking and DNT', () => {
    create({ disabled: true, events: { outboundLinks: true } })
    click('https://example.org')
    expect(request).not.toHaveBeenCalled()
    Object.defineProperty(navigator, 'doNotTrack', { configurable: true, value: '1' })
    create({ respectDNT: true, events: { outboundLinks: true } })
    click('https://example.org')
    expect(request).not.toHaveBeenCalled()
    Object.defineProperty(navigator, 'doNotTrack', { configurable: true, value: undefined })
  })

  it('uses callback-adjusted source pages', () => {
    const lib = create({ events: { outboundLinks: true } })
    const pages = lib.trackPageViews({ callback: () => ({ pg: '/articles/:slug' }) })
    request.mockClear()
    click('https://example.org')
    expect(request).toHaveBeenCalledWith('outbound', expect.objectContaining({ pg: '/articles/:slug' }))
    pages.stop()
  })

  it('uses a keepalive request so clicks can survive navigation', () => {
    request.mockRestore()
    const originalFetch = global.fetch
    const fetchMock = jest.fn().mockResolvedValue({})
    global.fetch = fetchMock
    try {
      create({ events: { outboundLinks: true }, apiURL: 'https://analytics.example.org/log' })
      click('https://tickets.example.org/event')
      expect(fetchMock).toHaveBeenCalledWith(
        'https://analytics.example.org/log/outbound',
        expect.objectContaining({ method: 'POST', keepalive: true }),
      )
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
        url: 'https://tickets.example.org/event',
        pg: '/article',
      })
    } finally {
      global.fetch = originalFetch
    }
  })

  it('skips oversized URLs and swallows network failures', async () => {
    create({ events: { outboundLinks: true } })
    click(`https://example.org/${'x'.repeat(2048)}`)
    expect(request).not.toHaveBeenCalled()
    request.mockRejectedValueOnce(new Error('offline'))
    click('https://example.org')
    await Promise.resolve()
    expect(request).toHaveBeenCalledTimes(1)
  })
})
