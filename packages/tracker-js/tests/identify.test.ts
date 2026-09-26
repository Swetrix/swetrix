import { setLocation } from './testUtils'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('Visitor identification', () => {
  const PROJECT_ID = 'test-project-id'

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
    mockFetch.mockReset()

    setLocation({ hostname: 'example.com', pathname: '/test-page' })
  })

  const lastRequestBody = () => JSON.parse(mockFetch.mock.calls[0][1].body)

  describe('identify', () => {
    test('should send the profileId as provided, without hashing it', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profileId: 'usr_user-12345' }),
      })

      const { init, identify } = await import('../src/index')
      init(PROJECT_ID, { devMode: true })
      await identify('user-12345')

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/log/identify'), expect.anything())
      expect(lastRequestBody()).toEqual({
        pid: PROJECT_ID,
        profileId: 'user-12345',
      })
    })

    test('should send traits alongside the profileId', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profileId: 'usr_user-12345' }),
      })

      const { init, identify } = await import('../src/index')
      init(PROJECT_ID, { devMode: true })
      await identify('user-12345', { email: 'john@example.com', plan: 'premium' })

      expect(lastRequestBody().traits).toEqual({
        email: 'john@example.com',
        plan: 'premium',
      })
    })

    test('should deduplicate repeated calls but re-send when traits change', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ profileId: 'usr_user-12345' }),
      })

      const { init, identify } = await import('../src/index')
      init(PROJECT_ID, { devMode: true })

      await identify('user-12345', { plan: 'free' })
      await identify('user-12345', { plan: 'free' })
      expect(mockFetch).toHaveBeenCalledTimes(1)

      await identify('user-12345', { plan: 'premium' })
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    test('setTraits should reuse the identified profileId', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ profileId: 'usr_user-12345' }),
      })

      const { init, identify, setTraits } = await import('../src/index')
      init(PROJECT_ID, { devMode: true })

      await identify('user-12345')
      await setTraits({ plan: 'enterprise', trialEndsAt: null })

      const body = JSON.parse(mockFetch.mock.calls[1][1].body)
      expect(body.profileId).toBe('user-12345')
      expect(body.traits).toEqual({ plan: 'enterprise', trialEndsAt: null })
    })

    test('setTraits should be a no-op when the visitor was never identified', async () => {
      const { init, setTraits } = await import('../src/index')
      init(PROJECT_ID, { devMode: true })

      await setTraits({ plan: 'enterprise' })

      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('getProfileId', () => {
    test('should return the identified profileId returned by the API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profileId: 'usr_user-12345' }),
      })

      const { init, identify, getProfileId } = await import('../src/index')
      init(PROJECT_ID, { devMode: true })
      await identify('user-12345')

      await expect(getProfileId()).resolves.toBe('usr_user-12345')
    })

    // Events carry the raw profileId and the server prefixes it, so the raw
    // value would not match anything in the dashboard (breaking revenue
    // attribution for sites that set profileId without calling identify()).
    test('should prefix a profileId set via init, matching how events are stored', async () => {
      const { init, getProfileId } = await import('../src/index')
      init(PROJECT_ID, { devMode: true, profileId: 'user-12345' })

      await expect(getProfileId()).resolves.toBe('usr_user-12345')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    test('should prefix the profileId even when the identify request failed', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })

      const { init, identify, getProfileId } = await import('../src/index')
      init(PROJECT_ID, { devMode: true })
      await identify('user-12345')

      await expect(getProfileId()).resolves.toBe('usr_user-12345')
    })

    test('should request an anonymous profileId when the visitor is not identified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profileId: 'anon_8214637194021987452' }),
      })

      const { init, getProfileId } = await import('../src/index')
      init(PROJECT_ID, { devMode: true })

      await expect(getProfileId()).resolves.toBe('anon_8214637194021987452')
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/log/profile-id'), expect.anything())
    })
  })
})
