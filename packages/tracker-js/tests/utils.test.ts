import * as utils from '../src/utils'

describe('Utility Functions', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'example.com',
        pathname: '/test-page',
        hash: '',
        search: '',
      },
      writable: true,
    })

    Object.defineProperty(document, 'referrer', {
      value: 'https://google.com',
      writable: true,
    })

    Object.defineProperty(navigator, 'language', {
      value: 'en-US',
      writable: true,
    })

    Object.defineProperty(navigator, 'languages', {
      value: ['en-US', 'en'],
      writable: true,
    })

    Object.defineProperty(navigator, 'webdriver', {
      value: false,
      writable: true,
    })
  })

  test('isInBrowser should return true in JSDOM environment', () => {
    expect(utils.isInBrowser()).toBe(true)
  })

  test('isLocalhost should detect localhost', () => {
    // Arrange
    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'localhost',
      },
      writable: true,
    })

    // Act & Assert
    expect(utils.isLocalhost()).toBe(true)

    // Test 127.0.0.1
    Object.defineProperty(window, 'location', {
      value: {
        hostname: '127.0.0.1',
      },
      writable: true,
    })
    expect(utils.isLocalhost()).toBe(true)

    // Test non-localhost
    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'example.com',
      },
      writable: true,
    })
    expect(utils.isLocalhost()).toBe(false)
  })

  test('isAutomated should detect webdriver', () => {
    // Arrange
    Object.defineProperty(navigator, 'webdriver', {
      value: true,
      writable: true,
    })

    // Act & Assert
    expect(utils.isAutomated()).toBe(true)

    // Test non-automated
    Object.defineProperty(navigator, 'webdriver', {
      value: false,
      writable: true,
    })
    expect(utils.isAutomated()).toBe(false)
  })

  test('getLocale should return the browser language', () => {
    expect(utils.getLocale()).toBe('en-US')

    // Test with navigator.languages undefined
    const originalLanguages = navigator.languages
    // Instead of deleting, set to undefined
    Object.defineProperty(navigator, 'languages', {
      value: undefined,
      writable: true,
    })
    expect(utils.getLocale()).toBe('en-US') // Should use navigator.language as fallback

    // Restore the original value
    Object.defineProperty(navigator, 'languages', {
      value: originalLanguages,
      writable: true,
    })
  })

  test('getReferrer should return the document referrer', () => {
    expect(utils.getReferrer()).toBe('https://google.com')

    // Test with empty referrer
    Object.defineProperty(document, 'referrer', {
      value: '',
      writable: true,
    })
    expect(utils.getReferrer()).toBeUndefined()
  })

  test('getPath should handle different URL formats', () => {
    // Arrange
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/test-page',
        hash: '',
        search: '',
      },
      writable: true,
    })

    // Act & Assert - basic path
    expect(utils.getPath({})).toBe('/test-page')

    // Test with hash
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/test-page',
        hash: '#section1',
        search: '',
      },
      writable: true,
    })
    expect(utils.getPath({ hash: true })).toBe('/test-page#section1')

    // Test with search
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/test-page',
        hash: '',
        search: '?param=value',
      },
      writable: true,
    })
    expect(utils.getPath({ search: true })).toBe('/test-page?param=value')

    // Test with both hash and search
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/test-page',
        hash: '#section1',
        search: '?param=value',
      },
      writable: true,
    })
    expect(utils.getPath({ hash: true, search: true })).toBe('/test-page#section1?param=value')

    // Test with search in hash
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/test-page',
        hash: '#section1?param=value',
        search: '',
      },
      writable: true,
    })
    expect(utils.getPath({ hash: true, search: true })).toBe('/test-page#section1?param=value')
  })

  test('getUTM* functions should extract UTM parameters', () => {
    // Arrange
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/landing',
        hash: '',
        search: '?utm_source=google&utm_medium=cpc&utm_campaign=summer&utm_term=analytics&utm_content=ad1',
      },
      writable: true,
    })

    // Act & Assert
    expect(utils.getUTMSource()).toBe('google')
    expect(utils.getUTMMedium()).toBe('cpc')
    expect(utils.getUTMCampaign()).toBe('summer')
    expect(utils.getUTMTerm()).toBe('analytics')
    expect(utils.getUTMContent()).toBe('ad1')

    // Test with 'ref' and 'source' parameters as well
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/landing',
        hash: '',
        search: '?ref=twitter',
      },
      writable: true,
    })
    expect(utils.getUTMSource()).toBe('twitter')

    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/landing',
        hash: '',
        search: '?source=newsletter',
      },
      writable: true,
    })
    expect(utils.getUTMSource()).toBe('newsletter')
  })
})
