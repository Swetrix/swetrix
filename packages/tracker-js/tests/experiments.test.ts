import { init, getExperiment, getExperiments, clearExperimentsCache } from '../src/index'
import { Lib } from '../src/Lib'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('A/B Testing Experiments', () => {
  const PROJECT_ID = 'test-project-id'
  let libInstance: Lib

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()

    // Reset fetch mock
    mockFetch.mockReset()

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

  describe('getExperiments', () => {
    beforeEach(async () => {
      jest.resetModules()
      const { init: freshInit } = await import('../src/index')
      libInstance = freshInit(PROJECT_ID, { devMode: true }) as Lib
    })

    test('should return experiments from API response', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          flags: { 'feature-flag-1': true },
          experiments: {
            'exp-checkout': 'variant-b',
            'exp-pricing': 'control',
          },
        }),
      })

      // Act
      const { getExperiments: freshGetExperiments } = await import('../src/index')
      const experiments = await freshGetExperiments()

      // Assert
      expect(experiments).toEqual({
        'exp-checkout': 'variant-b',
        'exp-pricing': 'control',
      })
    })

    test('should return empty object when no experiments in response', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          flags: { 'feature-flag-1': true },
        }),
      })

      // Act
      const { getExperiments: freshGetExperiments } = await import('../src/index')
      const experiments = await freshGetExperiments()

      // Assert
      expect(experiments).toEqual({})
    })

    test('should use cached experiments on subsequent calls', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          flags: {},
          experiments: { 'exp-1': 'variant-a' },
        }),
      })

      // Act
      const { getExperiments: freshGetExperiments } = await import('../src/index')
      await freshGetExperiments()
      await freshGetExperiments()

      // Assert - fetch should only be called once
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    test('should bypass cache when forceRefresh is true', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            flags: {},
            experiments: { 'exp-1': 'variant-a' },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            flags: {},
            experiments: { 'exp-1': 'variant-b' },
          }),
        })

      // Act
      const { getExperiments: freshGetExperiments } = await import('../src/index')
      const first = await freshGetExperiments()
      const second = await freshGetExperiments(undefined, true)

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(first).toEqual({ 'exp-1': 'variant-a' })
      expect(second).toEqual({ 'exp-1': 'variant-b' })
    })
  })

  describe('getExperiment', () => {
    beforeEach(async () => {
      jest.resetModules()
      const { init: freshInit } = await import('../src/index')
      libInstance = freshInit(PROJECT_ID, { devMode: true }) as Lib
    })

    test('should return specific experiment variant', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          flags: {},
          experiments: {
            'exp-checkout': 'new-checkout',
            'exp-pricing': 'control',
          },
        }),
      })

      // Act
      const { getExperiment: freshGetExperiment } = await import('../src/index')
      const variant = await freshGetExperiment('exp-checkout')

      // Assert
      expect(variant).toBe('new-checkout')
    })

    test('should return defaultVariant when experiment not found', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          flags: {},
          experiments: {},
        }),
      })

      // Act
      const { getExperiment: freshGetExperiment } = await import('../src/index')
      const variant = await freshGetExperiment('non-existent', undefined, 'fallback')

      // Assert
      expect(variant).toBe('fallback')
    })

    test('should return null when experiment not found and no default provided', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          flags: {},
          experiments: {},
        }),
      })

      // Act
      const { getExperiment: freshGetExperiment } = await import('../src/index')
      const variant = await freshGetExperiment('non-existent')

      // Assert
      expect(variant).toBeNull()
    })
  })

  describe('clearExperimentsCache', () => {
    test('should clear cache and fetch fresh data on next call', async () => {
      jest.resetModules()
      const {
        init: freshInit,
        getExperiments: freshGetExperiments,
        clearExperimentsCache: freshClearCache,
      } = await import('../src/index')
      freshInit(PROJECT_ID, { devMode: true })

      // Arrange
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            flags: {},
            experiments: { 'exp-1': 'variant-a' },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            flags: {},
            experiments: { 'exp-1': 'variant-b' },
          }),
        })

      // Act
      await freshGetExperiments()
      freshClearCache()
      const newExperiments = await freshGetExperiments()

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(newExperiments).toEqual({ 'exp-1': 'variant-b' })
    })
  })

  describe('profileId handling', () => {
    test('should include profileId in request when provided in options', async () => {
      jest.resetModules()
      const { init: freshInit, getExperiments: freshGetExperiments } = await import('../src/index')
      freshInit(PROJECT_ID, { devMode: true })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          flags: {},
          experiments: {},
        }),
      })

      // Act
      await freshGetExperiments({ profileId: 'user-123' })

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            pid: PROJECT_ID,
            profileId: 'user-123',
          }),
        }),
      )
    })

    test('should use global profileId when not provided in options', async () => {
      jest.resetModules()
      const { init: freshInit, getExperiments: freshGetExperiments } = await import('../src/index')
      freshInit(PROJECT_ID, { devMode: true, profileId: 'global-user' })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          flags: {},
          experiments: {},
        }),
      })

      // Act
      await freshGetExperiments()

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            pid: PROJECT_ID,
            profileId: 'global-user',
          }),
        }),
      )
    })
  })

  describe('error handling', () => {
    test('should return empty object when fetch fails', async () => {
      jest.resetModules()
      const { init: freshInit, getExperiments: freshGetExperiments } = await import('../src/index')
      freshInit(PROJECT_ID, { devMode: true })

      // Arrange
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // Suppress console.warn for this test
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      // Act
      const experiments = await freshGetExperiments()

      // Assert
      expect(experiments).toEqual({})
      consoleSpy.mockRestore()
    })

    test('should return empty object when response is not ok', async () => {
      jest.resetModules()
      const { init: freshInit, getExperiments: freshGetExperiments } = await import('../src/index')
      freshInit(PROJECT_ID, { devMode: true })

      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      // Suppress console.warn for this test
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      // Act
      const experiments = await freshGetExperiments()

      // Assert
      expect(experiments).toEqual({})
      consoleSpy.mockRestore()
    })
  })
})
