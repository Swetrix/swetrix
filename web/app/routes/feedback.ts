import type { ActionFunctionArgs } from 'react-router'
import { data } from 'react-router'

import { serverFetch } from '~/api/api.server'
import { isSelfhosted } from '~/lib/constants'
import {
  createHeadersWithCookies,
  redirectIfNotAuthenticated,
} from '~/utils/session.server'

export interface FeedbackActionData {
  success?: boolean
  error?: string
}

export async function loader() {
  return data(null, { status: 404 })
}

const getErrorMessage = (error: string | string[] | null) => {
  if (Array.isArray(error)) {
    return error.join(', ')
  }

  return error || 'Something went wrong, please try again'
}

export async function action({ request }: ActionFunctionArgs) {
  if (isSelfhosted) {
    return data<FeedbackActionData>({ error: 'Not found' }, { status: 404 })
  }

  redirectIfNotAuthenticated(request)

  const formData = await request.formData()
  const message = formData.get('message')?.toString().trim()

  if (!message) {
    return data<FeedbackActionData>(
      { error: 'Please enter your feedback' },
      { status: 400 },
    )
  }

  formData.set('message', message)

  const result = await serverFetch(request, 'user/feedback', {
    method: 'POST',
    body: formData,
  })

  if (result.error) {
    return data<FeedbackActionData>(
      { error: getErrorMessage(result.error) },
      {
        status: result.status,
        headers: createHeadersWithCookies(result.cookies),
      },
    )
  }

  return data<FeedbackActionData>(
    { success: true },
    { headers: createHeadersWithCookies(result.cookies) },
  )
}
