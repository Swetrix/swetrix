import { useCallback } from 'react'

import type {
  SSOProvider,
  SSOAuthURLResponse,
  SSOHashResponse,
  AuthMeResponse,
} from '~/api/api.server'

interface ProxyResponse<T> {
  data: T | null
  error: string | null
}

export function useAuthProxy() {
  const generateSSOAuthURL = useCallback(
    async (
      provider: SSOProvider,
      redirectUrl?: string,
    ): Promise<SSOAuthURLResponse> => {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateSSOAuthURL',
          provider,
          redirectUrl,
        }),
      })
      const result =
        (await response.json()) as ProxyResponse<SSOAuthURLResponse>
      if (result.error || !result.data) {
        throw new Error(result.error || 'Failed to generate SSO URL')
      }
      return result.data
    },
    [],
  )

  const getJWTBySSOHash = useCallback(
    async (
      hash: string,
      provider: SSOProvider,
      remember = false,
    ): Promise<SSOHashResponse> => {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getJWTBySSOHash',
          hash,
          provider,
          remember,
        }),
      })
      const result = (await response.json()) as ProxyResponse<SSOHashResponse>
      if (result.error || !result.data) {
        throw new Error(result.error || 'Failed to get JWT by SSO hash')
      }
      return result.data
    },
    [],
  )

  const processSSOTokenCommunityEdition = useCallback(
    async (
      code: string,
      hash: string,
      redirectUrl: string,
    ): Promise<unknown> => {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'processSSOTokenCommunityEdition',
          code,
          hash,
          redirectUrl,
        }),
      })
      const result = (await response.json()) as ProxyResponse<unknown>
      if (result.error) {
        throw new Error(result.error)
      }
      return result.data
    },
    [],
  )

  const linkBySSOHash = useCallback(
    async (hash: string, provider: SSOProvider): Promise<unknown> => {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'linkBySSOHash', hash, provider }),
      })
      const result = (await response.json()) as ProxyResponse<unknown>
      if (result.error) {
        throw new Error(result.error)
      }
      return result.data
    },
    [],
  )

  const processSSOToken = useCallback(
    async (token: string, hash: string): Promise<unknown> => {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'processSSOToken', token, hash }),
      })
      const result = (await response.json()) as ProxyResponse<unknown>
      if (result.error) {
        throw new Error(result.error)
      }
      return result.data
    },
    [],
  )

  const processGSCToken = useCallback(
    async (code: string, state: string): Promise<{ pid: string }> => {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'processGSCToken', code, state }),
      })
      const result = (await response.json()) as ProxyResponse<{ pid: string }>
      if (result.error || !result.data) {
        throw new Error(result.error || 'Failed to process GSC token')
      }
      return result.data
    },
    [],
  )

  const authMe = useCallback(
    async (signal?: AbortSignal): Promise<AuthMeResponse> => {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'authMe' }),
        signal,
      })
      const result = (await response.json()) as ProxyResponse<AuthMeResponse>
      if (result.error || !result.data) {
        throw new Error(result.error || 'Failed to fetch user')
      }
      return result.data
    },
    [],
  )

  return {
    generateSSOAuthURL,
    getJWTBySSOHash,
    processSSOTokenCommunityEdition,
    linkBySSOHash,
    processSSOToken,
    processGSCToken,
    authMe,
  }
}
