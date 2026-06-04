/// <reference types="jest" />

import { Lib } from '../src/Lib'
import { setLocation } from './testUtils'

const PROJECT_ID = 'test-project-id'
const RRWEB_URL = 'https://swetrix.org/rrweb.min.js'
const SIBLING_RRWEB_URL = 'https://cdn.swetrix.test/assets/rrweb.min.js'
const LOCAL_RRWEB_URL = 'http://localhost:8080/dist/rrweb.min.js'

const loadTracker = async () => {
  jest.resetModules()
  return import('../src/index')
}

const resetReplayGlobals = () => {
  delete (window as any).rrweb
  delete (window as any).__SWETRIX_RRWEB_LOADING__
  document.head.innerHTML = ''
  document.body.innerHTML = ''
}

const resolveRrwebScript = (
  record: jest.Mock,
): { recordOptions: () => any } => {
  let options: any
  ;(window as any).rrweb = {
    record: jest.fn((recordOptions) => {
      options = recordOptions
      return jest.fn()
    }),
  }

  const script = document.querySelector<HTMLScriptElement>(
    `script[src="${RRWEB_URL}"]`,
  )
  expect(script).toBeTruthy()
  ;(window as any).rrweb.record = record
  script!.dispatchEvent(new Event('load'))

  return { recordOptions: () => options }
}

describe('Session replay tracking', () => {
  let fetchMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
    resetReplayGlobals()
    setLocation({ hostname: 'example.com', pathname: '/checkout' })

    Object.defineProperty(navigator, 'doNotTrack', {
      value: null,
      writable: true,
      configurable: true,
    })

    fetchMock = jest.fn().mockResolvedValue({ ok: true })
    Object.defineProperty(globalThis, 'fetch', {
      value: fetchMock,
      writable: true,
      configurable: true,
    })
  })

  test('init with sessionReplay preloads rrweb but does not record', async () => {
    const { init } = await loadTracker()

    init(PROJECT_ID, { devMode: true, sessionReplay: true })

    const script = document.querySelector<HTMLScriptElement>(
      `script[src="${RRWEB_URL}"]`,
    )
    expect(script).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('session replay script defaults to the loaded tracker script directory', async () => {
    const script = document.createElement('script')
    script.src = 'https://cdn.swetrix.test/assets/swetrix.js'
    document.head.appendChild(script)

    const { init } = await loadTracker()
    init(PROJECT_ID, { devMode: true, sessionReplay: true })

    expect(
      document.querySelector<HTMLScriptElement>(
        `script[src="${SIBLING_RRWEB_URL}"]`,
      ),
    ).toBeTruthy()
  })

  test('session replay script resolves beside a localhost tracker build', async () => {
    const script = document.createElement('script')
    script.src = 'http://localhost:8080/dist/swetrix.js'
    document.head.appendChild(script)

    const { init } = await loadTracker()
    init(PROJECT_ID, { devMode: true, sessionReplay: true })

    expect(
      document.querySelector<HTMLScriptElement>(
        `script[src="${LOCAL_RRWEB_URL}"]`,
      ),
    ).toBeTruthy()
  })

  test('startSessionReplay loads rrweb, records events, and flushes chunks', async () => {
    const record = jest.fn((options) => {
      ;(record as any).options = options
      return jest.fn()
    })
    const { init, startSessionReplay } = await loadTracker()

    init(PROJECT_ID, { devMode: true })
    const startPromise = startSessionReplay({
      flushIntervalMs: 60_000,
      maxEventsPerChunk: 2,
    })
    resolveRrwebScript(record)

    const actions = await startPromise
    const recordOptions = (record as any).options
    expect(recordOptions.maskTextSelector).toBe('*')

    const startCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/session-replay/start'),
    )
    expect(startCall).toBeTruthy()
    expect(JSON.parse(startCall![1].body as string)).toEqual(
      expect.objectContaining({ privacy: 'total' }),
    )

    recordOptions.emit({ type: 2, timestamp: 100 })
    recordOptions.emit({ type: 3, timestamp: 200 })

    await actions.flush()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.swetrix.com/log/session-replay/start',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.swetrix.com/log/session-replay/chunk',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"chunkIndex":0'),
      }),
    )

    await actions.stop()
  })

  test('sampleRate can skip recording before loading rrweb', async () => {
    const { init, startSessionReplay } = await loadTracker()

    init(PROJECT_ID, { devMode: true })
    const actions = await startSessionReplay({ sampleRate: 0 })
    await actions.flush()
    await actions.stop()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(document.querySelector(`script[src="${RRWEB_URL}"]`)).toBeNull()
  })

  test('maxDurationMs stops recording and flushes buffered events', async () => {
    jest.useFakeTimers()
    const stopRecording = jest.fn()
    const record = jest.fn((options) => {
      ;(record as any).options = options
      return stopRecording
    })
    const { init, startSessionReplay } = await loadTracker()

    init(PROJECT_ID, { devMode: true })
    const startPromise = startSessionReplay({
      flushIntervalMs: 60_000,
      maxDurationMs: 1000,
    })
    resolveRrwebScript(record)

    await startPromise
    ;(record as any).options.emit({ type: 2, timestamp: 100 })

    await jest.advanceTimersByTimeAsync(1000)
    await Promise.resolve()

    expect(stopRecording).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.swetrix.com/log/session-replay/chunk',
      expect.objectContaining({
        body: expect.stringContaining('"timestamp":100'),
      }),
    )
  })

  test('idleTimeoutMs stops after inactivity and resets on activity', async () => {
    jest.useFakeTimers()
    const stopRecording = jest.fn()
    const record = jest.fn((options) => {
      ;(record as any).options = options
      return stopRecording
    })
    const { init, startSessionReplay } = await loadTracker()

    init(PROJECT_ID, { devMode: true })
    const startPromise = startSessionReplay({
      flushIntervalMs: 60_000,
      idleTimeoutMs: 1000,
    })
    resolveRrwebScript(record)

    await startPromise
    ;(record as any).options.emit({ type: 2, timestamp: 200 })

    await jest.advanceTimersByTimeAsync(900)
    window.dispatchEvent(new Event('mousemove'))
    await jest.advanceTimersByTimeAsync(900)

    expect(stopRecording).not.toHaveBeenCalled()

    await jest.advanceTimersByTimeAsync(100)
    await Promise.resolve()

    expect(stopRecording).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.swetrix.com/log/session-replay/chunk',
      expect.objectContaining({
        body: expect.stringContaining('"timestamp":200'),
      }),
    )
  })

  test('privacy modes map to rrweb options and keep internal emit', () => {
    const lib = new Lib(PROJECT_ID, { devMode: true })
    const emit = jest.fn()

    const total = (lib as any).getSessionReplayRecordOptions(
      'total',
      { blockSelector: '.secret', emit: jest.fn() },
      emit,
    )
    expect(total.maskAllInputs).toBe(true)
    expect(total.maskTextSelector).toBe('*')
    expect(total.blockSelector).toContain('.secret')
    expect(total.blockSelector).toContain('img')
    expect(total.recordCanvas).toBe(false)
    expect(total.inlineImages).toBe(false)
    expect(total.emit).toBe(emit)

    const normal = (lib as any).getSessionReplayRecordOptions(
      'normal',
      {},
      emit,
    )
    expect(normal.maskAllInputs).toBe(true)
    expect(normal.emit).toBe(emit)

    const freeLove = (lib as any).getSessionReplayRecordOptions(
      'none',
      { maskInputOptions: { email: false } },
      emit,
    )
    expect(freeLove.maskInputOptions).toEqual({
      email: false,
      password: true,
    })
    expect(freeLove.emit).toBe(emit)
  })

  test('invalid privacy values fall back to total privacy', async () => {
    const record = jest.fn((options) => {
      ;(record as any).options = options
      return jest.fn()
    })
    const { init, startSessionReplay } = await loadTracker()

    init(PROJECT_ID, { devMode: true })
    const startPromise = startSessionReplay({
      privacy: 'totl' as any,
    })
    resolveRrwebScript(record)

    const actions = await startPromise
    const startCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/session-replay/start'),
    )

    expect(startCall).toBeTruthy()
    expect(JSON.parse(startCall![1].body as string)).toEqual(
      expect.objectContaining({ privacy: 'total' }),
    )
    expect((record as any).options.maskTextSelector).toBe('*')

    await actions.stop()
  })

  test('rrweb loader clears failed loads so startSessionReplay can retry', async () => {
    const record = jest.fn(() => jest.fn())
    const { init, startSessionReplay } = await loadTracker()

    init(PROJECT_ID, { devMode: true })
    const failedStart = startSessionReplay()
    const failedScript = document.querySelector<HTMLScriptElement>(
      `script[src="${RRWEB_URL}"]`,
    )
    expect(failedScript).toBeTruthy()
    failedScript!.dispatchEvent(new Event('error'))

    await failedStart
    expect((window as any).__SWETRIX_RRWEB_LOADING__).toBeUndefined()

    const retryStart = startSessionReplay()
    const scripts = document.querySelectorAll<HTMLScriptElement>(
      `script[src="${RRWEB_URL}"]`,
    )
    expect(scripts).toHaveLength(2)
    ;(window as any).rrweb = { record }
    scripts[1].dispatchEvent(new Event('load'))

    const actions = await retryStart
    expect(record).toHaveBeenCalled()

    await actions.stop()
  })

  test('user rrweb emit is composed with Swetrix uploads', async () => {
    const record = jest.fn((options) => {
      ;(record as any).options = options
      return jest.fn()
    })
    const userEmit = jest.fn()
    const { init, startSessionReplay } = await loadTracker()

    init(PROJECT_ID, { devMode: true })
    const startPromise = startSessionReplay({
      rrweb: { emit: userEmit, maskAllInputs: true },
    })
    resolveRrwebScript(record)

    const actions = await startPromise
    const event = { type: 2, timestamp: 300 }
    ;(record as any).options.emit(event)
    await actions.flush()

    expect(userEmit).toHaveBeenCalledWith(event)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.swetrix.com/log/session-replay/chunk',
      expect.objectContaining({
        body: expect.stringContaining('"timestamp":300'),
      }),
    )

    await actions.stop()
  })

  test('DNT and disabled tracking return no-op controls without uploading', async () => {
    Object.defineProperty(navigator, 'doNotTrack', {
      value: '1',
      writable: true,
      configurable: true,
    })

    const { init, startSessionReplay } = await loadTracker()
    init(PROJECT_ID, { devMode: true, respectDNT: true })

    const actions = await startSessionReplay()
    await actions.flush()
    await actions.stop()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(document.querySelector(`script[src="${RRWEB_URL}"]`)).toBeNull()

    resetReplayGlobals()
    Object.defineProperty(navigator, 'doNotTrack', {
      value: null,
      writable: true,
      configurable: true,
    })

    const disabledModule = await loadTracker()
    disabledModule.init(PROJECT_ID, { devMode: true, disabled: true })
    const disabledActions = await disabledModule.startSessionReplay()
    await disabledActions.flush()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(document.querySelector(`script[src="${RRWEB_URL}"]`)).toBeNull()
  })
})
