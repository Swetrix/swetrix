import { Lib } from '../src/Lib'
import { setLocation } from './testUtils'

describe('Error sampling', () => {
  let lib: Lib
  let sendRequest: jest.SpyInstance

  const errorEvent = () =>
    new ErrorEvent('error', {
      message: 'Boom',
      filename: 'app.js',
      lineno: 1,
      colno: 1,
      error: new Error('Boom'),
    })

  beforeEach(() => {
    setLocation({ pathname: '/home' })
    lib = new Lib('test-project', { devMode: true })
    sendRequest = jest.spyOn(lib as any, 'sendRequest').mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('sends every error when sampleRate is 1', () => {
    const actions = lib.trackErrors({ sampleRate: 1 })
    jest.spyOn(Math, 'random').mockReturnValue(0.5)

    lib.captureError(errorEvent())
    actions.stop()

    expect(sendRequest).toHaveBeenCalledWith('error', expect.objectContaining({ name: 'Error', message: 'Boom' }))
  })

  test('sends no errors when sampleRate is 0', () => {
    const actions = lib.trackErrors({ sampleRate: 0 })
    jest.spyOn(Math, 'random').mockReturnValue(0.5)

    lib.captureError(errorEvent())
    actions.stop()

    expect(sendRequest).not.toHaveBeenCalled()
  })

  test('keeps roughly sampleRate share of errors', () => {
    const actions = lib.trackErrors({ sampleRate: 0.2 })
    const random = jest.spyOn(Math, 'random')

    random.mockReturnValue(0.1)
    lib.captureError(errorEvent())
    expect(sendRequest).toHaveBeenCalledTimes(1)

    random.mockReturnValue(0.9)
    lib.captureError(errorEvent())
    expect(sendRequest).toHaveBeenCalledTimes(1)

    actions.stop()
  })
})
