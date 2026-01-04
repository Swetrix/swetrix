import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { data } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { serverFetch } from '~/api/api.server'
import { User } from '~/lib/models/User'
import UserSettings from '~/pages/UserSettings'
import { redirectIfNotAuthenticated, createHeadersWithCookies, createAuthCookies } from '~/utils/session.server'
import { isValidEmail, isValidPassword, MIN_PASSWORD_CHARS, MAX_PASSWORD_CHARS } from '~/utils/validator'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export async function loader({ request }: LoaderFunctionArgs) {
  redirectIfNotAuthenticated(request)
  return null
}

export interface UserSettingsActionData {
  success?: boolean
  intent?: string
  error?: string
  fieldErrors?: {
    email?: string
    password?: string
    repeat?: string
  }
  user?: Partial<User>
  apiKey?: string
  twoFAData?: {
    secret?: string
    otpauthUrl?: string
    twoFactorRecoveryCode?: string
  }
}

export async function action({ request }: ActionFunctionArgs) {
  redirectIfNotAuthenticated(request)

  const formData = await request.formData()
  const intent = formData.get('intent')?.toString()

  switch (intent) {
    case 'update-profile': {
      const email = formData.get('email')?.toString() || ''
      const password = formData.get('password')?.toString() || ''
      const repeat = formData.get('repeat')?.toString() || ''
      const timezone = formData.get('timezone')?.toString()
      const timeFormat = formData.get('timeFormat')?.toString()
      const reportFrequency = formData.get('reportFrequency')?.toString()

      const fieldErrors: UserSettingsActionData['fieldErrors'] = {}

      if (email && !isValidEmail(email)) {
        fieldErrors.email = 'Please enter a valid email address'
      }

      if (password) {
        if (!isValidPassword(password)) {
          fieldErrors.password = `Password must be at least ${MIN_PASSWORD_CHARS} characters`
        }
        if (password.length > MAX_PASSWORD_CHARS) {
          fieldErrors.password = `Password must be at most ${MAX_PASSWORD_CHARS} characters`
        }
        if (password !== repeat) {
          fieldErrors.repeat = 'Passwords do not match'
        }
      }

      if (fieldErrors.email || fieldErrors.password || fieldErrors.repeat) {
        return data<UserSettingsActionData>({ intent, fieldErrors }, { status: 400 })
      }

      const updateData: Record<string, unknown> = {}
      if (email) updateData.email = email
      if (password) updateData.password = password
      if (timezone) updateData.timezone = timezone
      if (timeFormat) updateData.timeFormat = timeFormat
      if (reportFrequency) updateData.reportFrequency = reportFrequency

      const result = await serverFetch<User>(request, 'user', {
        method: 'PUT',
        body: updateData,
      })

      if (result.error) {
        return data<UserSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<UserSettingsActionData>(
        { intent, success: true, user: result.data as User },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'generate-api-key': {
      const result = await serverFetch<{ apiKey: string }>(request, 'user/api-key', {
        method: 'POST',
      })

      if (result.error) {
        return data<UserSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<UserSettingsActionData>(
        { intent, success: true, apiKey: result.data?.apiKey },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'delete-api-key': {
      const result = await serverFetch(request, 'user/api-key', {
        method: 'DELETE',
      })

      if (result.error) {
        return data<UserSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<UserSettingsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'toggle-live-visitors': {
      const show = formData.get('show') === 'true'

      const result = await serverFetch<Partial<User>>(request, 'user/live-visitors', {
        method: 'PUT',
        body: { show },
      })

      if (result.error) {
        return data<UserSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<UserSettingsActionData>(
        { intent, success: true, user: result.data as Partial<User> },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'toggle-login-notifications': {
      const receiveLoginNotifications = formData.get('receiveLoginNotifications') === 'true'

      const result = await serverFetch(request, 'user/recieve-login-notifications', {
        method: 'POST',
        body: { receiveLoginNotifications },
      })

      if (result.error) {
        return data<UserSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<UserSettingsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'confirm-email': {
      const result = await serverFetch(request, 'user/confirm_email', {
        method: 'POST',
      })

      if (result.error) {
        return data<UserSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<UserSettingsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'delete-account': {
      const feedback = formData.get('feedback')?.toString() || ''

      const result = await serverFetch(request, 'user', {
        method: 'DELETE',
        body: { feedback },
      })

      if (result.error) {
        return data<UserSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<UserSettingsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'generate-2fa': {
      const result = await serverFetch<{ secret: string; otpauthUrl: string }>(request, '2fa/generate', {
        method: 'POST',
      })

      if (result.error) {
        return data<UserSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<UserSettingsActionData>(
        { intent, success: true, twoFAData: result.data as { secret: string; otpauthUrl: string } },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'enable-2fa': {
      const twoFactorAuthenticationCode = formData.get('code')?.toString() || ''

      const result = await serverFetch<{ twoFactorRecoveryCode: string; accessToken: string; refreshToken: string }>(
        request,
        '2fa/enable',
        {
          method: 'POST',
          body: { twoFactorAuthenticationCode },
        },
      )

      if (result.error) {
        return data<UserSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      // Set new auth cookies from the response
      const { twoFactorRecoveryCode, accessToken, refreshToken } = result.data!
      const cookies = createAuthCookies({ accessToken, refreshToken }, true)

      return data<UserSettingsActionData>(
        { intent, success: true, twoFAData: { twoFactorRecoveryCode } },
        { headers: createHeadersWithCookies(cookies) },
      )
    }

    case 'disable-2fa': {
      const twoFactorAuthenticationCode = formData.get('code')?.toString() || ''

      const result = await serverFetch(request, '2fa/disable', {
        method: 'POST',
        body: { twoFactorAuthenticationCode },
      })

      if (result.error) {
        return data<UserSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<UserSettingsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    default:
      return data<UserSettingsActionData>({ error: 'Unknown action' }, { status: 400 })
  }
}

export default function UserSettingsPage() {
  return <UserSettings />
}
