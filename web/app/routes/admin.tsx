import { useTranslation } from 'react-i18next'
import type {
  ActionFunctionArgs,
  LinksFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from 'react-router'
import { data, useLoaderData } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { serverFetch } from '~/api/api.server'
import { isSelfhosted } from '~/lib/constants'
import AdminPage from '~/pages/Admin'
import NotFound from '~/pages/NotFound'
// The billboard.js theming (line widths, axis fonts, dark-mode grid colours)
// lives in this stylesheet - without it the admin charts render with
// billboard defaults
import ProjectViewStyle from '~/styles/ProjectViewStyle.css?url'
import type {
  AdminActionData,
  AdminBilling,
  AdminBotBlocks,
  AdminCharts,
  AdminDatabaseInfo,
  AdminFeedbackList,
  AdminLoaderData,
  AdminOrganisationDetails,
  AdminOrganisationsList,
  AdminOverview,
  AdminProjectDetails,
  AdminProjectsList,
  AdminRevenue,
  AdminTab,
  AdminTopProjects,
  AdminUserDetails,
  AdminUsersList,
} from '~/pages/Admin/types'
import { getDescription, getTitle } from '~/utils/seo'
import { createHeadersWithCookies, hasAuthTokens } from '~/utils/session.server'

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: ProjectViewStyle },
]

export const meta: MetaFunction<typeof loader> = ({ loaderData: data }) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { t } = useTranslation('common')

  // Render the exact 404 meta for non-admins so the page is
  // indistinguishable from a non-existent route
  if (!data) {
    return [
      ...getTitle(t('notFoundPage.title')),
      ...getDescription(t('notFoundPage.description')),
    ]
  }

  return [...getTitle('Admin')]
}

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

const TABS: AdminTab[] = [
  'overview',
  'billing',
  'users',
  'projects',
  'organisations',
  'feedback',
  'bot-blocks',
  'database',
]

const CHART_DAYS = [30, 90, 180, 365]

const notFound = () => new Response('Not Found', { status: 404 })

const parseTab = (tab: string | null): AdminTab =>
  TABS.includes(tab as AdminTab) ? (tab as AdminTab) : 'overview'

export async function loader({ request }: LoaderFunctionArgs) {
  // The admin panel exists on the Cloud edition only, and only for allowlisted
  // admins. Everyone else gets a 404, as if this page does not exist.
  if (isSelfhosted || !hasAuthTokens(request)) {
    return data(null, { status: 404 })
  }

  const url = new URL(request.url)
  const searchParams = url.searchParams
  const tab = parseTab(searchParams.get('tab'))

  const page = searchParams.get('page') || '0'
  const search = searchParams.get('search') || ''
  const filter = searchParams.get('filter') || 'all'
  const sortBy = searchParams.get('sortBy') || 'created'
  const order = searchParams.get('order') || 'DESC'

  const cookies: string[] = []

  const adminFetch = async <T,>(endpoint: string): Promise<T> => {
    const result = await serverFetch<T>(request, endpoint)

    cookies.push(...result.cookies)

    // The backend responds with 404 for non-admins - mirror it here so the
    // page is indistinguishable from a non-existent route
    if (
      result.status === 401 ||
      result.status === 403 ||
      result.status === 404
    ) {
      throw notFound()
    }

    if (result.error || !result.data) {
      throw new Response('Something went wrong', { status: 500 })
    }

    return result.data
  }

  const listParams = new URLSearchParams({
    page,
    search,
    filter,
    sortBy,
    order,
  }).toString()

  const loadTabData = async (): Promise<AdminLoaderData> => {
    if (tab === 'overview') {
      const chartDays = CHART_DAYS.includes(Number(searchParams.get('days')))
        ? Number(searchParams.get('days'))
        : 30

      const [overview, charts, revenue] = await Promise.all([
        adminFetch<AdminOverview>('admin/overview'),
        adminFetch<AdminCharts>(`admin/charts?days=${chartDays}`),
        // Paddle can be slow/unavailable - the page still renders without it
        adminFetch<AdminRevenue>('admin/revenue').catch(() => null),
      ])

      return { tab, overview, charts, chartDays, revenue }
    }

    if (tab === 'billing') {
      const billing = await adminFetch<AdminBilling>('admin/billing')

      return { tab, billing }
    }

    if (tab === 'bot-blocks') {
      const days = [7, 30, 90].includes(Number(searchParams.get('days')))
        ? Number(searchParams.get('days'))
        : 7

      const botBlocks = await adminFetch<AdminBotBlocks>(
        `admin/bot-blocks?days=${days}`,
      )

      return { tab, botBlocks }
    }

    if (tab === 'users') {
      const userId = searchParams.get('user')

      const [users, userDetails] = await Promise.all([
        adminFetch<AdminUsersList>(`admin/users?${listParams}`),
        userId
          ? adminFetch<AdminUserDetails>(
              `admin/users/${encodeURIComponent(userId)}`,
            ).catch(() => null)
          : Promise.resolve(null),
      ])

      return { tab, users, userDetails }
    }

    if (tab === 'projects') {
      const projectId = searchParams.get('project')

      if (projectId) {
        const projectDetails = await adminFetch<AdminProjectDetails>(
          `admin/projects/${encodeURIComponent(projectId)}`,
        ).catch(() => null)

        return { tab, projectDetails }
      }

      if (searchParams.get('view') === 'top') {
        const days = [1, 7, 30].includes(Number(searchParams.get('days')))
          ? Number(searchParams.get('days'))
          : 7

        const topProjects = await adminFetch<AdminTopProjects>(
          `admin/projects/top?days=${days}`,
        )

        return { tab, topProjects }
      }

      const projects = await adminFetch<AdminProjectsList>(
        `admin/projects?${listParams}`,
      )

      return { tab, projects }
    }

    if (tab === 'organisations') {
      const organisationId = searchParams.get('org')

      const [organisations, organisationDetails] = await Promise.all([
        adminFetch<AdminOrganisationsList>(`admin/organisations?${listParams}`),
        organisationId
          ? adminFetch<AdminOrganisationDetails>(
              `admin/organisations/${encodeURIComponent(organisationId)}`,
            ).catch(() => null)
          : Promise.resolve(null),
      ])

      return { tab, organisations, organisationDetails }
    }

    if (tab === 'feedback') {
      const type = ['user', 'cancellation', 'deletion'].includes(
        searchParams.get('type') || '',
      )
        ? searchParams.get('type')
        : 'user'

      const feedbackParams = new URLSearchParams({
        type: type as string,
        page,
        search,
        order,
      }).toString()

      const feedback = await adminFetch<AdminFeedbackList>(
        `admin/feedback?${feedbackParams}`,
      )

      return { tab, feedback }
    }

    const database = await adminFetch<AdminDatabaseInfo>('admin/database')

    return { tab, database }
  }

  let loaderData: AdminLoaderData

  try {
    loaderData = await loadTabData()
  } catch (error) {
    // Render the same NotFound page a non-existent route would render
    if (error instanceof Response && error.status === 404) {
      return data(null, {
        status: 404,
        headers: createHeadersWithCookies(cookies),
      })
    }

    throw error
  }

  return data<AdminLoaderData>(loaderData, {
    headers: createHeadersWithCookies(cookies),
  })
}

export async function action({ request }: ActionFunctionArgs) {
  if (isSelfhosted || !hasAuthTokens(request)) {
    throw notFound()
  }

  const formData = await request.formData()
  const intent = formData.get('intent')?.toString()

  if (intent !== 'update-user') {
    return data<AdminActionData>({ error: 'Unknown action' }, { status: 400 })
  }

  const userId = formData.get('userId')?.toString()

  if (!userId) {
    return data<AdminActionData>(
      { error: 'User ID is required' },
      { status: 400 },
    )
  }

  const parseJsonField = (
    field: string,
  ): Record<string, unknown> | null | undefined => {
    const raw = formData.get(field)?.toString().trim()

    if (!raw) {
      return null
    }

    try {
      return JSON.parse(raw)
    } catch {
      return undefined
    }
  }

  const addonOverrides = parseJsonField('addonOverrides')
  const entitlementOverrides = parseJsonField('entitlementOverrides')

  if (addonOverrides === undefined || entitlementOverrides === undefined) {
    return data<AdminActionData>(
      { error: 'Overrides must be valid JSON objects' },
      { status: 400 },
    )
  }

  const planTypeRaw = formData.get('planType')?.toString()

  const result = await serverFetch(
    request,
    `admin/users/${encodeURIComponent(userId)}`,
    {
      method: 'PATCH',
      body: {
        planType: planTypeRaw || null,
        addonOverrides,
        entitlementOverrides,
      },
    },
  )

  if (result.status === 401 || result.status === 403 || result.status === 404) {
    throw notFound()
  }

  if (result.error) {
    return data<AdminActionData>(
      {
        error: Array.isArray(result.error)
          ? result.error.join(', ')
          : result.error,
      },
      { status: 400, headers: createHeadersWithCookies(result.cookies) },
    )
  }

  return data<AdminActionData>(
    { success: true },
    { headers: createHeadersWithCookies(result.cookies) },
  )
}

export default function Admin() {
  const loaderData = useLoaderData<typeof loader>()

  if (!loaderData) {
    return <NotFound />
  }

  return <AdminPage />
}
