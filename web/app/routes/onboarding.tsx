import { useTranslation } from 'react-i18next'
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from 'react-router'
import { data, redirect } from 'react-router'
import { SitemapFunction } from 'remix-sitemap'

import { getAuthenticatedUser, serverFetch } from '~/api/api.server'
import { isSelfhosted } from '~/lib/constants'
import { DEFAULT_METAINFO, Metainfo } from '~/lib/models/Metainfo'
import { Project } from '~/lib/models/Project'
import { User } from '~/lib/models/User'
import Onboarding from '~/pages/Onboarding'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'
import {
  redirectIfNotAuthenticated,
  createHeadersWithCookies,
} from '~/utils/session.server'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export const meta: MetaFunction = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { t } = useTranslation('common')

  return [
    ...getTitle(t('onboarding.welcome')),
    ...getDescription(t('description.onboarding')),
    ...getPreviewImage(),
  ]
}

export interface OnboardingLoaderData {
  project: Project | null
  deviceInfo: {
    browser: string | null
    os: string | null
  }
  metainfo: Metainfo
  onboardingStep: string | null
}

export async function loader({ request }: LoaderFunctionArgs) {
  redirectIfNotAuthenticated(request)

  const userAgent = request.headers.get('user-agent')
  let deviceInfo: { browser: string | null; os: string | null } = {
    browser: 'Chrome',
    os: 'Windows',
  }

  if (userAgent) {
    const { UAParser } = await import('@ua-parser-js/pro-business')
    const parser = new UAParser(userAgent)

    deviceInfo = {
      browser: parser.getBrowser().name || null,
      os: parser.getOS().name || null,
    }
  }

  const authResult = await getAuthenticatedUser(request)
  const user = authResult?.user
  const cookies: string[] = authResult?.cookies || []

  const metainfoResult = await serverFetch<Metainfo>(request, 'user/metainfo', {
    skipAuth: true,
  })
  const metainfo = metainfoResult.data ?? DEFAULT_METAINFO
  const allCookies = [...cookies, ...metainfoResult.cookies]

  if (user?.user?.hasCompletedOnboarding) {
    if (allCookies.length > 0) {
      return redirect('/dashboard', {
        headers: createHeadersWithCookies(allCookies),
      })
    }

    return redirect('/dashboard')
  }

  const rawOnboardingStep = user?.user?.onboardingStep as string | undefined
  // Migrate users who were on removed steps
  const onboardingStep =
    rawOnboardingStep === 'select_plan'
      ? 'create_project'
      : rawOnboardingStep === 'verify_email'
        ? 'setup_tracking'
        : rawOnboardingStep

  if (
    onboardingStep === 'setup_tracking' ||
    onboardingStep === 'waiting_for_events'
  ) {
    const projectsResult = await serverFetch<{
      results: Project[]
      total: number
    }>(request, '/project?take=1&skip=0')

    const project = projectsResult.data?.results?.[0] || null
    const finalCookies = [...allCookies, ...projectsResult.cookies]

    const loaderData: OnboardingLoaderData = {
      project,
      deviceInfo,
      metainfo,
      onboardingStep: onboardingStep ?? null,
    }

    if (finalCookies.length > 0) {
      return data(loaderData, {
        headers: createHeadersWithCookies(finalCookies),
      })
    }

    return loaderData
  }

  if (allCookies.length > 0) {
    return data(
      {
        project: null,
        deviceInfo,
        metainfo,
        onboardingStep: onboardingStep ?? null,
      } as OnboardingLoaderData,
      {
        headers: createHeadersWithCookies(allCookies),
      },
    )
  }

  return {
    project: null,
    deviceInfo,
    metainfo,
    onboardingStep: onboardingStep ?? null,
  } as OnboardingLoaderData
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
          {
            intent,
            fieldErrors: { name: 'Project name must be 50 characters or less' },
          },
          { status: 400 },
        )
      }

      const result = await serverFetch<Project>(request, 'project', {
        method: 'POST',
        body: { name },
      })

      if (result.error) {
        return data<OnboardingActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
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
        return data<OnboardingActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<OnboardingActionData>(
        { intent, success: true, user: result.data as User },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'complete-onboarding': {
      const result = await serverFetch<User>(
        request,
        'user/onboarding/complete',
        {
          method: 'POST',
        },
      )

      if (result.error) {
        return data<OnboardingActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<OnboardingActionData>(
        { intent, success: true, user: result.data as User },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    default:
      return data<OnboardingActionData>(
        { error: 'Unknown action' },
        { status: 400 },
      )
  }
}

export default function OnboardingRoute() {
  return <Onboarding />
}
