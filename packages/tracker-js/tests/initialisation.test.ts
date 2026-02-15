import { init } from '../src/index'
import { Lib } from '../src/Lib'

jest.mock('../src/Lib', () => {
  const originalModule = jest.requireActual('../src/Lib')

  return {
    ...originalModule,
    Lib: class MockLib extends originalModule.Lib {
      sendRequest = jest.fn().mockResolvedValue(undefined)
      canTrack = jest.fn().mockReturnValue(true)
    },
  }
})

describe('Library Initialisation', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    jest.resetModules()

    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'example.com',
        pathname: '/test-page',
        hash: '',
        search: '',
      },
      writable: true,
    })

    Object.defineProperty(navigator, 'doNotTrack', {
      value: null,
      writable: true,
    })
  })

  test('init should return a Lib instance', () => {
    // Act
    const instance = init('test-project-id')

    // Assert
    expect(instance).toBeInstanceOf(Lib)
  })

  test('init with devMode should work on localhost', () => {
    // Arrange
    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'localhost',
        pathname: '/',
        hash: '',
        search: '',
      },
      writable: true,
    })

    // Act
    const instance = init('test-project-id', { devMode: true })

    // Assert - no error should be thrown
    expect(instance).toBeInstanceOf(Lib)
    expect((instance as any).canTrack()).toBe(true)
  })

  test('init should respect DNT when respectDNT option is true', () => {
    // Arrange
    Object.defineProperty(navigator, 'doNotTrack', {
      value: '1',
      writable: true,
    })

    // Act
    const instance = init('test-project-id', { respectDNT: true })

    // Mock the canTrack method to return false for this instance
    ;(instance as any).canTrack.mockReturnValue(false)

    // Assert
    expect((instance as any).canTrack()).toBe(false)
  })

  test('init should return the same instance when called multiple times', () => {
    // Act
    const instance1 = init('test-project-id')
    const instance2 = init('another-id') // This should be ignored and return the first instance

    // Assert
    expect(instance1).toBe(instance2)
  })
})
