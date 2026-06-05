/// <reference types="jest" />

import { Lib } from '../src/Lib'
import { setLocation } from './testUtils'

const PROJECT_ID = 'test-project-id'
const RRWEB_URL = 'https://cdn.jsdelivr.net/npm/swetrix@latest/dist/replaylibrary.min.js'
const mockRrwebRecord = jest.fn()

jest.mock('rrweb', () => ({
  record: mockRrwebRecord,
}))

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

const usePackageRrweb = () => {
  const stopRecording = jest.fn()
  mockRrwebRecord.mockImplementation((recordOptions) => {
    ;(mockRrwebRecord as any).options = recordOptions
    return stopRecording
  })

  return {
    recordOptions: () => (mockRrwebRecord as any).options,
    stopRecording,
  }
}

describe('Session replay tracking', () => {
  let fetchMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockRrwebRecord.mockReset()
    delete (mockRrwebRecord as any).options
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

  test('init with preloadSessionReplay loads npm rrweb but does not record', async () => {
    const { init } = await loadTracker()

    init(PROJECT_ID, { devMode: true, preloadSessionReplay: true })
    await (window as any).__SWETRIX_RRWEB_LOADING__

    expect((window as any).rrweb.record).toBe(mockRrwebRecord)
    expect(document.querySelector(`script[src="${RRWEB_URL}"]`)).toBeNull()
    expect(mockRrwebRecord).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('session replay script uses jsDelivr for the public swetrix.org loader', async () => {
    const script = document.createElement('script')
    script.src = 'https://swetrix.org/swetrix.js'
    document.head.appendChild(script)

    const { init } = await loadTracker()
    init(PROJECT_ID, { devMode: true, preloadSessionReplay: true })

    expect(
      document.querySelector<HTMLScriptElement>(
        `script[src="${RRWEB_URL}"]`,
      ),
    ).toBeTruthy()
    expect(mockRrwebRecord).not.toHaveBeenCalled()
  })

  test('preloadSessionReplay can load rrweb from a custom script URL', async () => {
    const rrwebUrl = 'https://cdn.example.com/rrweb.min.js'
    const { init } = await loadTracker()

    init(PROJECT_ID, {
      devMode: true,
      preloadSessionReplay: { rrwebUrl },
    })

    expect(
      document.querySelector<HTMLScriptElement>(`script[src="${rrwebUrl}"]`),
    ).toBeTruthy()
    expect(mockRrwebRecord).not.toHaveBeenCalled()
  })

  test('startSessionReplay imports npm rrweb, records events, and flushes chunks', async () => {
    const { recordOptions } = usePackageRrweb()
    const { init, startSessionReplay } = await loadTracker()

    init(PROJECT_ID, { devMode: true })
    const actions = await startSessionReplay({
      flushIntervalMs: 60_000,
      maxEventsPerChunk: 2,
    })
    const options = recordOptions()
    expect(options.maskTextSelector).toBe('*')
    expect(document.querySelector(`script[src="${RRWEB_URL}"]`)).toBeNull()

    const startCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/session-replay/start'),
    )
    expect(startCall).toBeTruthy()
    expect(JSON.parse(startCall![1].body as string)).toEqual(
      expect.objectContaining({ privacy: 'total' }),
    )

    options.emit({ type: 2, timestamp: 100 })
    options.emit({ type: 3, timestamp: 200 })

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

  test('concurrent startSessionReplay calls share one recorder', async () => {
    const { stopRecording } = usePackageRrweb()
    const { init, startSessionReplay } = await loadTracker()

    init(PROJECT_ID, { devMode: true })
    const [firstActions, secondActions] = await Promise.all([
      startSessionReplay({ flushIntervalMs: 60_000 }),
      startSessionReplay({ flushIntervalMs: 10_000 }),
    ])

    expect(firstActions).toBe(secondActions)
    expect(mockRrwebRecord).toHaveBeenCalledTimes(1)
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).includes('/session-replay/start'),
      ),
    ).toHaveLength(1)

    await firstActions.stop()
    expect(stopRecording).toHaveBeenCalledTimes(1)
  })

  test('sampleRate can skip recording before loading rrweb', async () => {
    const { init, startSessionReplay } = await loadTracker()

    init(PROJECT_ID, { devMode: true })
    const actions = await startSessionReplay({ sampleRate: 0 })
    await actions.flush()
    await actions.stop()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(document.querySelector(`script[src="${RRWEB_URL}"]`)).toBeNull()
    expect(mockRrwebRecord).not.toHaveBeenCalled()
  })

  test('maxDurationMs stops recording and flushes buffered events', async () => {
    jest.useFakeTimers()
    const { recordOptions, stopRecording } = usePackageRrweb()
    const { init, startSessionReplay } = await loadTracker()

    init(PROJECT_ID, { devMode: true })
    await startSessionReplay({
      flushIntervalMs: 60_000,
      maxDurationMs: 1000,
    })
    recordOptions().emit({ type: 2, timestamp: 100 })

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
    const { recordOptions, stopRecording } = usePackageRrweb()
    const { init, startSessionReplay } = await loadTracker()

    init(PROJECT_ID, { devMode: true })
    await startSessionReplay({
      flushIntervalMs: 60_000,
      idleTimeoutMs: 1000,
    })
    recordOptions().emit({ type: 2, timestamp: 200 })

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
    const { recordOptions } = usePackageRrweb()
    const { init, startSessionReplay } = await loadTracker()

    init(PROJECT_ID, { devMode: true })
    const actions = await startSessionReplay({
      privacy: 'totl' as any,
    })
    const startCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/session-replay/start'),
    )

    expect(startCall).toBeTruthy()
    expect(JSON.parse(startCall![1].body as string)).toEqual(
      expect.objectContaining({ privacy: 'total' }),
    )
    expect(recordOptions().maskTextSelector).toBe('*')

    await actions.stop()
  })

  test('script rrweb loader clears failed loads so startSessionReplay can retry', async () => {
    const record = jest.fn(() => jest.fn())
    const trackerScript = document.createElement('script')
    trackerScript.src = 'https://example.com/swetrix.js'
    document.head.appendChild(trackerScript)
    const rrwebUrl = 'https://example.com/replaylibrary.min.js'
    const { init, startSessionReplay } = await loadTracker()

    init(PROJECT_ID, { devMode: true })
    const failedStart = startSessionReplay()
    const failedScript = document.querySelector<HTMLScriptElement>(
      `script[src="${rrwebUrl}"]`,
    )
    expect(failedScript).toBeTruthy()
    failedScript!.dispatchEvent(new Event('error'))

    await failedStart
    expect((window as any).__SWETRIX_RRWEB_LOADING__).toBeUndefined()

    const retryStart = startSessionReplay()
    const scripts = document.querySelectorAll<HTMLScriptElement>(
      `script[src="${rrwebUrl}"]`,
    )
    expect(scripts[1]).toBeTruthy()
    expect(scripts[1]).not.toBe(failedScript)
    ;(window as any).rrweb = { record }
    scripts[1].dispatchEvent(new Event('load'))

    const actions = await retryStart
    expect((window as any).rrweb.record).toBe(record)
    expect(record).toHaveBeenCalled()

    await actions.stop()
  })

  test('user rrweb emit is composed with Swetrix uploads', async () => {
    const { recordOptions } = usePackageRrweb()
    const userEmit = jest.fn()
    const { init, startSessionReplay } = await loadTracker()

    init(PROJECT_ID, { devMode: true })
    const actions = await startSessionReplay({
      rrweb: { emit: userEmit, maskAllInputs: true },
    })
    const event = { type: 2, timestamp: 300 }
    recordOptions().emit(event)
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
    expect(mockRrwebRecord).not.toHaveBeenCalled()

    resetReplayGlobals()
    mockRrwebRecord.mockReset()
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
    expect(mockRrwebRecord).not.toHaveBeenCalled()
  })
})
