import { Lib } from '../src/Lib'
import { setLocation } from './testUtils'

describe('Page titles', () => {
  let lib: Lib
  let sendRequest: jest.SpyInstance

  beforeEach(() => {
    jest.useFakeTimers()
    setLocation({ pathname: '/home' })
    document.title = 'Home | Example'
    lib = new Lib('test-project', { devMode: true })
    sendRequest = jest.spyOn(lib as any, 'sendRequest').mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it('captures the document title alongside the initial page path', () => {
    lib.trackPageViews()

    expect(sendRequest).toHaveBeenCalledWith(
      '',
      expect.objectContaining({
        pg: '/home',
        title: 'Home | Example',
      }),
    )
  })

  it('reads the new title on SPA navigation without firing for title-only changes', () => {
    lib.trackPageViews()
    document.title = 'Home (1)'
    jest.advanceTimersByTime(2000)
    expect(sendRequest.mock.calls.filter(([path]) => path === '')).toHaveLength(1)

    setLocation({ pathname: '/pricing' })
    document.title = 'Pricing | Example'
    jest.advanceTimersByTime(2000)

    expect(sendRequest).toHaveBeenCalledWith(
      '',
      expect.objectContaining({
        pg: '/pricing',
        title: 'Pricing | Example',
      }),
    )
  })

  it('lets the callback inspect and replace the title', () => {
    const callback = jest.fn((payload) => {
      expect(payload.title).toBe('Home | Example')
      return { ...payload, title: 'Public title' }
    })
    lib.trackPageViews({ callback })

    expect(callback).toHaveBeenCalledTimes(1)
    expect(sendRequest).toHaveBeenCalledWith('', expect.objectContaining({ title: 'Public title' }))
  })

  it.each([null, ''])('preserves a callback title opt-out of %p', (title) => {
    lib.trackPageViews({ callback: () => ({ title }) })
    expect(sendRequest).toHaveBeenCalledWith('', expect.objectContaining({ title }))
  })

  it('still lets callbacks cancel the pageview', () => {
    lib.trackPageViews({ callback: () => false })
    expect(sendRequest).not.toHaveBeenCalled()
  })

  it('defaults manual pageviews to the current title', () => {
    lib.submitPageView({ pg: '/manual' }, false, {})
    expect(sendRequest).toHaveBeenCalledWith('', expect.objectContaining({ pg: '/manual', title: 'Home | Example' }))
  })

  it.each(['Manual title', null, ''])('preserves a manual title of %p', (title) => {
    lib.submitPageView({ pg: '/manual', title }, false, {})
    expect(sendRequest).toHaveBeenCalledWith('', expect.objectContaining({ title }))
  })

  it('limits document and callback titles without dropping the pageview', () => {
    document.title = 'a'.repeat(3000)
    lib.submitPageView({ pg: '/manual' }, false, {})
    expect(sendRequest).toHaveBeenLastCalledWith('', expect.objectContaining({ title: 'a'.repeat(2048) }))

    lib.trackPageViews({ callback: () => ({ title: 'b'.repeat(3000) }) })
    expect(sendRequest).toHaveBeenLastCalledWith('', expect.objectContaining({ title: 'b'.repeat(2048) }))
  })
})
