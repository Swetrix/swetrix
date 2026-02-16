import { LockIcon } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { DashboardBlockReason } from '~/lib/models/User'
import { useAuth } from '~/providers/AuthProvider'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import { Text } from '~/ui/Text'
import routes from '~/utils/routes'

const LockedDashboard = () => {
  const { project } = useCurrentProject()
  const { user } = useAuth()
  const { t } = useTranslation('common')

  const message = useMemo(() => {
    if (project?.role === 'owner') {
      if (
        user?.dashboardBlockReason ===
        DashboardBlockReason.exceeding_plan_limits
      ) {
        return t('project.locked.descExceedingTier')
      }
      if (user?.dashboardBlockReason === DashboardBlockReason.trial_ended) {
        return t('project.locked.descTialEnded')
      }
      if (user?.dashboardBlockReason === DashboardBlockReason.payment_failed) {
        return t('project.locked.descPaymentFailed')
      }
      if (
        user?.dashboardBlockReason ===
        DashboardBlockReason.subscription_cancelled
      ) {
        return t('project.locked.descSubCancelled')
      }
    }

    if (project?.role === 'admin' || project?.role === 'viewer') {
      return t('project.locked.descSharedProject')
    }

    return t('project.locked.descGenericIssue')
  }, [t, user, project])

  return (
    <div className='mx-auto w-full max-w-2xl py-16 text-center'>
      <div className='mx-auto mb-6 flex size-14 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-900'>
        <LockIcon className='size-7 text-yellow-500 dark:text-yellow-400' />
      </div>
      <Text as='h3' size='xl' weight='medium' tracking='tight'>
        {t('project.locked.title')}
      </Text>
      <Text
        as='p'
        size='sm'
        colour='secondary'
        className='mx-auto mt-2 max-w-md whitespace-pre-line'
      >
        {message}
        {project?.role === 'owner' ? (
          <>
            <br />
            <br />
            {t('project.locked.resolve')}
          </>
        ) : null}
      </Text>
      {project?.role === 'owner' ? (
        <div className='mt-6 flex justify-center gap-3'>
          <Link
            to={routes.billing}
            className='inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 dark:focus:ring-slate-300 dark:focus:ring-offset-slate-900 focus:outline-hidden'
          >
            {t('project.locked.manageSubscription')}
          </Link>
          <Link
            to={routes.contact}
            className='inline-flex items-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 dark:focus:ring-slate-300 dark:focus:ring-offset-slate-900 focus:outline-hidden dark:bg-slate-900 dark:text-gray-50 dark:hover:bg-slate-800'
          >
            {t('notFoundPage.support')}
          </Link>
        </div>
      ) : null}
    </div>
  )
}

export default LockedDashboard
