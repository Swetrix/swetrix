import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  data,
} from 'react-router'

import {
  generateSSOAuthURLServer,
  getJWTBySSOHashServer,
  processSSOTokenCommunityEditionServer,
  linkBySSOHashServer,
  processSSOTokenServer,
  processGSCTokenServer,
  authMeServer,
  linkSSOWithPasswordServer,
  type SSOProvider,
  type SSOAuthURLResponse,
  type SSOHashResponse,
  type SSOHashSuccessResponse,
  type AuthMeResponse,
  type LinkSSOWithPasswordParams,
} from '~/api/api.server'
import { createAuthCookies } from '~/utils/session.server'

interface ProxyRequest {
  action:
    | 'generateSSOAuthURL'
    | 'getJWTBySSOHash'
    | 'processSSOTokenCommunityEdition'
    | 'linkBySSOHash'
    | 'processSSOToken'
    | 'processGSCToken'
    | 'authMe'
    | 'linkSSOWithPassword'
  provider?: SSOProvider
  redirectUrl?: string
  hash?: string
  token?: string
  code?: string
  state?: string
  remember?: boolean
  email?: string
  password?: string
  ssoId?: string | number
  twoFactorAuthenticationCode?: string
}

interface ProxyResponse<T> {
  data: T | null
  error: string | null
}

export async function action({ request }: ActionFunctionArgs) {
  const body = (await request.json()) as ProxyRequest
  const { action } = body

  try {
    switch (action) {
      case 'generateSSOAuthURL': {
        if (!body.provider) {
          return data<ProxyResponse<null>>(
            { data: null, error: 'provider is required' },
            { status: 400 },
          )
        }
        const result = await generateSSOAuthURLServer(
          request,
          body.provider,
          body.redirectUrl,
        )
        return data<ProxyResponse<SSOAuthURLResponse>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'getJWTBySSOHash': {
        if (!body.hash || !body.provider) {
          return data<ProxyResponse<null>>(
            { data: null, error: 'hash and provider are required' },
            { status: 400 },
          )
        }
        const result = await getJWTBySSOHashServer(
          request,
          body.hash,
          body.provider,
        )

        if (result.data) {
          // Only set cookies if this is a success response (not linking required)
          if ('accessToken' in result.data) {
            const { accessToken, refreshToken } = result.data
            const cookies = createAuthCookies(
              { accessToken, refreshToken },
              body.remember ?? false,
            )

            return data<ProxyResponse<SSOHashResponse>>(
              {
                data: result.data,
                error: null,
              },
              {
                headers: cookies.map((cookie) => ['Set-Cookie', cookie]) as [
                  string,
                  string,
                ][],
              },
            )
          }

          // Return linking required response without cookies
          return data<ProxyResponse<SSOHashResponse>>({
            data: result.data,
            error: null,
          })
        }

        return data<ProxyResponse<SSOHashResponse>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'processSSOTokenCommunityEdition': {
        if (!body.code || !body.hash || !body.redirectUrl) {
          return data<ProxyResponse<null>>(
            { data: null, error: 'code, hash, and redirectUrl are required' },
            { status: 400 },
          )
        }
        const result = await processSSOTokenCommunityEditionServer(
          request,
          body.code,
          body.hash,
          body.redirectUrl,
        )
        return data<ProxyResponse<unknown>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'linkBySSOHash': {
        if (!body.hash || !body.provider) {
          return data<ProxyResponse<null>>(
            { data: null, error: 'hash and provider are required' },
            { status: 400 },
          )
        }
        const result = await linkBySSOHashServer(
          request,
          body.hash,
          body.provider,
        )
        return data<ProxyResponse<unknown>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'processSSOToken': {
        if (!body.token || !body.hash) {
          return data<ProxyResponse<null>>(
            { data: null, error: 'token and hash are required' },
            { status: 400 },
          )
        }
        const result = await processSSOTokenServer(
          request,
          body.token,
          body.hash,
        )
        return data<ProxyResponse<unknown>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'processGSCToken': {
        if (!body.code || !body.state) {
          return data<ProxyResponse<null>>(
            { data: null, error: 'code and state are required' },
            { status: 400 },
          )
        }
        const result = await processGSCTokenServer(
          request,
          body.code,
          body.state,
        )
        return data<ProxyResponse<{ pid: string }>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'authMe': {
        const result = await authMeServer(request)
        return data<ProxyResponse<AuthMeResponse>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'linkSSOWithPassword': {
        if (!body.email || !body.password || !body.provider || !body.ssoId) {
          return data<ProxyResponse<null>>(
            {
              data: null,
              error: 'email, password, provider, and ssoId are required',
            },
            { status: 400 },
          )
        }
        const params: LinkSSOWithPasswordParams = {
          email: body.email,
          password: body.password,
          provider: body.provider,
          ssoId: body.ssoId,
          twoFactorAuthenticationCode: body.twoFactorAuthenticationCode,
        }
        const result = await linkSSOWithPasswordServer(request, params)

        if (result.data && 'accessToken' in result.data) {
          const { accessToken, refreshToken } =
            result.data as SSOHashSuccessResponse
          const cookies = createAuthCookies(
            { accessToken, refreshToken },
            body.remember ?? false,
          )

          return data<ProxyResponse<SSOHashResponse>>(
            {
              data: result.data,
              error: null,
            },
            {
              headers: cookies.map((cookie) => ['Set-Cookie', cookie]) as [
                string,
                string,
              ][],
            },
          )
        }

        return data<ProxyResponse<SSOHashResponse>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      default:
        return data<ProxyResponse<null>>(
          { data: null, error: `Unknown action: ${action}` },
          { status: 400 },
        )
    }
  } catch (error) {
    console.error('[api.auth] Proxy request failed:', error)
    return data<ProxyResponse<null>>(
      {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function loader({ request: _request }: LoaderFunctionArgs) {
  return data({ error: 'Use POST method' }, { status: 405 })
}
