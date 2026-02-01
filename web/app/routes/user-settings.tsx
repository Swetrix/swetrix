import { useTranslation } from 'react-i18next'
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from 'react-router'
import { data } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { serverFetch } from '~/api/api.server'
import { isSelfhosted } from '~/lib/constants'
import { Metainfo } from '~/lib/models/Metainfo'
import { UsageInfo } from '~/lib/models/Usageinfo'
import { User } from '~/lib/models/User'
import UserSettings from '~/pages/UserSettings'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'
import {
  redirectIfNotAuthenticated,
  createHeadersWithCookies,
  createAuthCookies,
} from '~/utils/session.server'
import {
  isValidEmail,
  isValidPassword,
  MIN_PASSWORD_CHARS,
  MAX_PASSWORD_CHARS,
} from '~/utils/validator'

export const meta: MetaFunction = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { t } = useTranslation('common')

  return [
    ...getTitle(t('titles.profileSettings')),
    ...getDescription(t('description.default')),
    ...getPreviewImage(),
  ]
}

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export interface UserSettingsLoaderData {
  metainfo: Metainfo | null
  usageInfo: UsageInfo | null
}

export async function loader({ request }: LoaderFunctionArgs) {
  redirectIfNotAuthenticated(request)

  if (isSelfhosted) {
    return data<UserSettingsLoaderData>({
      metainfo: null,
      usageInfo: null,
    })
  }

  const [metainfoResult, usageInfoResult] = await Promise.all([
    serverFetch<Metainfo>(request, 'user/metainfo'),
    serverFetch<UsageInfo>(request, 'user/usageinfo'),
  ])

  const cookies = [...metainfoResult.cookies, ...usageInfoResult.cookies]

  return data<UserSettingsLoaderData>(
    {
      metainfo: metainfoResult.data,
      usageInfo: usageInfoResult.data,
    },
    { headers: createHeadersWithCookies(cookies) },
  )
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
  data?: unknown
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
        return data<UserSettingsActionData>(
          { intent, fieldErrors },
          { status: 400 },
        )
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
        return data<UserSettingsActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<UserSettingsActionData>(
        { intent, success: true, user: result.data as User },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'generate-api-key': {
      const result = await serverFetch<{ apiKey: string }>(
        request,
        'user/api-key',
        {
          method: 'POST',
        },
      )

      if (result.error) {
        return data<UserSettingsActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
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
        return data<UserSettingsActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<UserSettingsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'toggle-live-visitors': {
      const show = formData.get('show') === 'true'

      const result = await serverFetch<Partial<User>>(
        request,
        'user/live-visitors',
        {
          method: 'PUT',
          body: { show },
        },
      )

      if (result.error) {
        return data<UserSettingsActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<UserSettingsActionData>(
        { intent, success: true, user: result.data as Partial<User> },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'toggle-login-notifications': {
      const receiveLoginNotifications =
        formData.get('receiveLoginNotifications') === 'true'

      const result = await serverFetch(
        request,
        'user/recieve-login-notifications',
        {
          method: 'POST',
          body: { receiveLoginNotifications },
        },
      )

      if (result.error) {
        return data<UserSettingsActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
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
        return data<UserSettingsActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
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
        return data<UserSettingsActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<UserSettingsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'generate-2fa': {
      const result = await serverFetch<{ secret: string; otpauthUrl: string }>(
        request,
        '2fa/generate',
        {
          method: 'POST',
        },
      )

      if (result.error) {
        return data<UserSettingsActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<UserSettingsActionData>(
        {
          intent,
          success: true,
          twoFAData: result.data as { secret: string; otpauthUrl: string },
        },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'enable-2fa': {
      const twoFactorAuthenticationCode = formData.get('code')?.toString() || ''

      const result = await serverFetch<{
        twoFactorRecoveryCode: string
        accessToken: string
        refreshToken: string
      }>(request, '2fa/enable', {
        method: 'POST',
        body: { twoFactorAuthenticationCode },
      })

      if (result.error) {
        return data<UserSettingsActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
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
        return data<UserSettingsActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<UserSettingsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'accept-project-share': {
      const shareId = formData.get('shareId')?.toString()

      if (!shareId) {
        return data<UserSettingsActionData>(
          { intent, error: 'Share ID is required' },
          { status: 400 },
        )
      }

      const result = await serverFetch(request, `user/share/${shareId}`, {
        method: 'POST',
      })

      if (result.error) {
        return data<UserSettingsActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<UserSettingsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'reject-project-share': {
      const shareId = formData.get('shareId')?.toString()

      if (!shareId) {
        return data<UserSettingsActionData>(
          { intent, error: 'Share ID is required' },
          { status: 400 },
        )
      }

      const result = await serverFetch(request, `user/share/${shareId}`, {
        method: 'DELETE',
      })

      if (result.error) {
        return data<UserSettingsActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<UserSettingsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'unlink-sso': {
      const provider = formData.get('provider')?.toString()

      if (!provider) {
        return data<UserSettingsActionData>(
          { intent, error: 'Provider is required' },
          { status: 400 },
        )
      }

      const result = await serverFetch(request, 'v1/auth/sso/unlink', {
        method: 'DELETE',
        body: { provider },
      })

      if (result.error) {
        return data<UserSettingsActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<UserSettingsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'remove-tg-integration': {
      const tgID = formData.get('tgID')?.toString()

      if (!tgID) {
        return data<UserSettingsActionData>(
          { intent, error: 'Telegram ID is required' },
          { status: 400 },
        )
      }

      const result = await serverFetch(request, `user/tg/${tgID}`, {
        method: 'DELETE',
      })

      if (result.error) {
        return data<UserSettingsActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<UserSettingsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'preview-subscription-update': {
      const planId = Number(formData.get('planId'))

      const result = await serverFetch(request, 'user/preview-plan', {
        method: 'POST',
        body: { planId },
      })

      if (result.error) {
        return data<UserSettingsActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<UserSettingsActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'change-subscription-plan': {
      const planId = Number(formData.get('planId'))

      const result = await serverFetch(request, 'user/change-plan', {
        method: 'POST',
        body: { planId },
      })

      if (result.error) {
        return data<UserSettingsActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<UserSettingsActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'get-metainfo': {
      const result = await serverFetch<Metainfo>(request, 'user/metainfo')

      if (result.error) {
        return data<UserSettingsActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<UserSettingsActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'accept-organisation-invitation': {
      const membershipId = formData.get('membershipId')?.toString()

      if (!membershipId) {
        return data<UserSettingsActionData>(
          { intent, error: 'Membership ID is required' },
          { status: 400 },
        )
      }

      const result = await serverFetch(
        request,
        `user/organisation/${membershipId}`,
        {
          method: 'POST',
        },
      )

      if (result.error) {
        return data<UserSettingsActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<UserSettingsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'reject-organisation-invitation': {
      const membershipId = formData.get('membershipId')?.toString()

      if (!membershipId) {
        return data<UserSettingsActionData>(
          { intent, error: 'Membership ID is required' },
          { status: 400 },
        )
      }

      const result = await serverFetch(
        request,
        `user/organisation/${membershipId}`,
        {
          method: 'DELETE',
        },
      )

      if (result.error) {
        return data<UserSettingsActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<UserSettingsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    default:
      return data<UserSettingsActionData>(
        { error: 'Unknown action' },
        { status: 400 },
      )
  }
}

export default function UserSettingsPage() {
  return <UserSettings />
}
