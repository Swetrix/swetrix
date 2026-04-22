import * as utils from '../src/utils'
import { setLocation } from './testUtils'

describe('Utility Functions', () => {
  beforeEach(() => {
    setLocation({ hostname: 'example.com', pathname: '/test-page' })

    Object.defineProperty(document, 'referrer', {
      value: 'https://google.com',
      writable: true,
      configurable: true,
    })

    Object.defineProperty(navigator, 'language', {
      value: 'en-US',
      writable: true,
      configurable: true,
    })

    Object.defineProperty(navigator, 'languages', {
      value: ['en-US', 'en'],
      writable: true,
      configurable: true,
    })

    Object.defineProperty(navigator, 'webdriver', {
      value: false,
      writable: true,
      configurable: true,
    })
  })

  test('isInBrowser should return true in JSDOM environment', () => {
    expect(utils.isInBrowser()).toBe(true)
  })

  test('isLocalhost should detect localhost', () => {
    setLocation({ hostname: 'localhost' })
    expect(utils.isLocalhost()).toBe(true)

    setLocation({ hostname: '127.0.0.1' })
    expect(utils.isLocalhost()).toBe(true)

    setLocation({ hostname: 'example.com' })
    expect(utils.isLocalhost()).toBe(false)
  })

  test('isAutomated should detect webdriver', () => {
    Object.defineProperty(navigator, 'webdriver', {
      value: true,
      writable: true,
      configurable: true,
    })
    expect(utils.isAutomated()).toBe(true)

    Object.defineProperty(navigator, 'webdriver', {
      value: false,
      writable: true,
      configurable: true,
    })
    expect(utils.isAutomated()).toBe(false)
  })

  test('getLocale should return the browser language', () => {
    expect(utils.getLocale()).toBe('en-US')

    const originalLanguages = navigator.languages
    Object.defineProperty(navigator, 'languages', {
      value: undefined,
      writable: true,
      configurable: true,
    })
    expect(utils.getLocale()).toBe('en-US')

    Object.defineProperty(navigator, 'languages', {
      value: originalLanguages,
      writable: true,
      configurable: true,
    })
  })

  test('getReferrer should return the document referrer', () => {
    expect(utils.getReferrer()).toBe('https://google.com')

    Object.defineProperty(document, 'referrer', {
      value: '',
      writable: true,
      configurable: true,
    })
    expect(utils.getReferrer()).toBeUndefined()
  })

  test('getQueryString should return the URL query string without the leading ?', () => {
    setLocation({ pathname: '/landing', search: '?fbclid=AbCdEf123&utm_source=newsletter' })
    expect(utils.getQueryString()).toBe('fbclid=AbCdEf123&utm_source=newsletter')

    setLocation({ pathname: '/landing' })
    expect(utils.getQueryString()).toBeUndefined()

    // Hash-routed SPAs sometimes carry the query string after the `#`.
    setLocation({ pathname: '/', hash: '#/landing?gclid=xyz' })
    expect(utils.getQueryString()).toBe('gclid=xyz')
  })

  test('getPath should handle different URL formats', () => {
    setLocation({ pathname: '/test-page' })
    expect(utils.getPath({})).toBe('/test-page')

    setLocation({ pathname: '/test-page', hash: '#section1' })
    expect(utils.getPath({ hash: true })).toBe('/test-page#section1')

    setLocation({ pathname: '/test-page', search: '?param=value' })
    expect(utils.getPath({ search: true })).toBe('/test-page?param=value')

    setLocation({ pathname: '/test-page', hash: '#section1', search: '?param=value' })
    expect(utils.getPath({ hash: true, search: true })).toBe('/test-page#section1?param=value')

    setLocation({ pathname: '/test-page', hash: '#section1?param=value' })
    expect(utils.getPath({ hash: true, search: true })).toBe('/test-page#section1?param=value')
  })

  test('getUTM* functions should extract UTM parameters', () => {
    setLocation({
      pathname: '/landing',
      search: '?utm_source=google&utm_medium=cpc&utm_campaign=summer&utm_term=analytics&utm_content=ad1',
    })

    expect(utils.getUTMSource()).toBe('google')
    expect(utils.getUTMMedium()).toBe('cpc')
    expect(utils.getUTMCampaign()).toBe('summer')
    expect(utils.getUTMTerm()).toBe('analytics')
    expect(utils.getUTMContent()).toBe('ad1')

    setLocation({ pathname: '/landing', search: '?ref=twitter' })
    expect(utils.getUTMSource()).toBe('twitter')

    setLocation({ pathname: '/landing', search: '?source=newsletter' })
    expect(utils.getUTMSource()).toBe('newsletter')
  })
})
