import { init, track } from '../src/index'
import { Lib } from '../src/Lib'

jest.mock('../src/Lib', () => {
  const originalModule = jest.requireActual('../src/Lib')

  return {
    ...originalModule,
    Lib: class MockLib extends originalModule.Lib {
      sendRequest = jest.fn().mockResolvedValue(undefined)
    },
  }
})

describe('Custom Event Tracking', () => {
  const PROJECT_ID = 'test-project-id'
  let libInstance: Lib

  beforeEach(() => {
    jest.clearAllMocks()

    libInstance = init(PROJECT_ID, { devMode: true }) as Lib

    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'example.com',
        pathname: '/test-page',
        hash: '',
        search: '',
      },
      writable: true,
    })
  })

  test('track function should track a custom event', async () => {
    // Arrange
    const eventName = 'button_click'

    // Act
    await track({ ev: eventName })

    // Assert
    expect((libInstance as any).sendRequest).toHaveBeenCalledTimes(1)
    expect((libInstance as any).sendRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        pid: PROJECT_ID,
        ev: eventName,
      }),
    )
  })

  test('track function with unique flag should track unique event', async () => {
    // Arrange
    const eventName = 'form_submit'

    // Act
    await track({ ev: eventName, unique: true })

    // Assert
    expect((libInstance as any).sendRequest).toHaveBeenCalledTimes(1)
    expect((libInstance as any).sendRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        pid: PROJECT_ID,
        ev: eventName,
        unique: true,
      }),
    )
  })

  test('track function with metadata should include metadata in request', async () => {
    // Arrange
    const eventName = 'purchase'
    const metadata = {
      product: 'premium_plan',
      price: '99.99',
    }

    // Act
    await track({
      ev: eventName,
      meta: metadata,
    })

    // Assert
    expect((libInstance as any).sendRequest).toHaveBeenCalledTimes(1)
    expect((libInstance as any).sendRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        pid: PROJECT_ID,
        ev: eventName,
        meta: metadata,
      }),
    )
  })

  test('should not track when library is not initialized', async () => {
    // Create a new module import to reset the LIB_INSTANCE
    jest.resetModules()
    const { track: newTrack } = await import('../src/index')

    // Act
    await newTrack({ ev: 'test_event' })

    // Assert - no request should be sent
    expect((libInstance as any).sendRequest).not.toHaveBeenCalled()
  })
})
