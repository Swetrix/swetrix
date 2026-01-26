import { useTranslation } from 'react-i18next'
import type {
  ActionFunctionArgs,
  HeadersFunction,
  MetaFunction,
} from 'react-router'
import { data, redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { serverFetch } from '~/api/api.server'
import CreateNewPassword from '~/pages/Auth/CreateNewPassword'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'
import {
  isValidPassword,
  MIN_PASSWORD_CHARS,
  MAX_PASSWORD_CHARS,
} from '~/utils/validator'

export const meta: MetaFunction = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { t } = useTranslation('common')

  return [
    ...getTitle(t('titles.recovery')),
    ...getDescription(t('description.recovery')),
    ...getPreviewImage(),
  ]
}

export const headers: HeadersFunction = ({ parentHeaders }) => {
  parentHeaders.set('X-Frame-Options', 'DENY')
  return parentHeaders
}

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export interface CreateNewPasswordActionData {
  success?: boolean
  error?: string
  fieldErrors?: {
    password?: string
    repeat?: string
  }
  timestamp?: number
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { id } = params
  const formData = await request.formData()
  const password = formData.get('password')?.toString() || ''
  const repeat = formData.get('repeat')?.toString() || ''

  const fieldErrors: CreateNewPasswordActionData['fieldErrors'] = {}

  if (!isValidPassword(password)) {
    fieldErrors.password = `Password must be at least ${MIN_PASSWORD_CHARS} characters`
  }

  if (password.length > MAX_PASSWORD_CHARS) {
    fieldErrors.password = `Password must be at most ${MAX_PASSWORD_CHARS} characters`
  }

  if (password !== repeat) {
    fieldErrors.repeat = 'Passwords do not match'
  }

  if (fieldErrors.password || fieldErrors.repeat) {
    return data<CreateNewPasswordActionData>(
      { fieldErrors, timestamp: Date.now() },
      { status: 400 },
    )
  }

  const result = await serverFetch(
    request,
    `v1/auth/reset-password/confirm/${id}`,
    {
      method: 'POST',
      body: { newPassword: password },
      skipAuth: true,
    },
  )

  if (result.error) {
    return data<CreateNewPasswordActionData>(
      { error: result.error as string, timestamp: Date.now() },
      { status: 400 },
    )
  }

  return redirect('/login?password_updated=true')
}

export default function Index() {
  return <CreateNewPassword />
}
