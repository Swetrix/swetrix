import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from 'react-router'
import { data } from 'react-router'
import { SitemapFunction } from 'remix-sitemap'

import { serverFetch } from '~/api/api.server'
import { Project } from '~/lib/models/Project'
import { User } from '~/lib/models/User'
import Onboarding from '~/pages/Onboarding'
import { redirectIfNotAuthenticated, createHeadersWithCookies } from '~/utils/session.server'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export const meta: MetaFunction = () => {
  return [
    { title: 'Onboarding - Swetrix' },
    { name: 'description', content: 'Get started with Swetrix analytics in just a few steps.' },
  ]
}

export async function loader({ request }: LoaderFunctionArgs) {
  redirectIfNotAuthenticated(request)
  return null
}

export interface OnboardingActionData {
  success?: boolean
  intent?: string
  error?: string
  fieldErrors?: {
    name?: string
  }
  project?: Project
  user?: User
}

export async function action({ request }: ActionFunctionArgs) {
  redirectIfNotAuthenticated(request)

  const formData = await request.formData()
  const intent = formData.get('intent')?.toString()

  switch (intent) {
    case 'create-project': {
      const name = formData.get('name')?.toString() || ''

      if (!name.trim()) {
        return data<OnboardingActionData>(
          { intent, fieldErrors: { name: 'Project name is required' } },
          { status: 400 },
        )
      }

      if (name.length > 50) {
        return data<OnboardingActionData>(
          { intent, fieldErrors: { name: 'Project name must be 50 characters or less' } },
          { status: 400 },
        )
      }

      const result = await serverFetch<Project>(request, 'project', {
        method: 'POST',
        body: { name },
      })

      if (result.error) {
        return data<OnboardingActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<OnboardingActionData>(
        { intent, success: true, project: result.data as Project },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'update-step': {
      const step = formData.get('step')?.toString() || ''

      const result = await serverFetch<User>(request, 'user/onboarding/step', {
        method: 'POST',
        body: { step },
      })

      if (result.error) {
        return data<OnboardingActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<OnboardingActionData>(
        { intent, success: true, user: result.data as User },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'complete-onboarding': {
      const result = await serverFetch<User>(request, 'user/onboarding/complete', {
        method: 'POST',
      })

      if (result.error) {
        return data<OnboardingActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<OnboardingActionData>(
        { intent, success: true, user: result.data as User },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'delete-account': {
      const result = await serverFetch(request, 'user', {
        method: 'DELETE',
      })

      if (result.error) {
        return data<OnboardingActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<OnboardingActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    default:
      return data<OnboardingActionData>({ error: 'Unknown action' }, { status: 400 })
  }
}

export default function OnboardingRoute() {
  return <Onboarding />
}
