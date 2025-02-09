import React, { useMemo } from 'react'
import { LockClosedIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router'
import { User, DashboardBlockReason } from '~/lib/models/User'
import { ProjectForShared } from '~/lib/models/SharedProject'
import { useTranslation } from 'react-i18next'
import routes from '~/utils/routes'

interface LockedDashboardProps {
  user?: User
  project: ProjectForShared
}

const LockedDashboard = ({ user, project }: LockedDashboardProps) => {
  const { t } = useTranslation('common')

  const message = useMemo(() => {
    if (project.role === 'owner') {
      if (user?.dashboardBlockReason === DashboardBlockReason.exceeding_plan_limits) {
        return t('project.locked.descExceedingTier')
      }
      if (user?.dashboardBlockReason === DashboardBlockReason.trial_ended) {
        return t('project.locked.descTialEnded')
      }
      if (user?.dashboardBlockReason === DashboardBlockReason.payment_failed) {
        return t('project.locked.descPaymentFailed')
      }
      if (user?.dashboardBlockReason === DashboardBlockReason.subscription_cancelled) {
        return t('project.locked.descSubCancelled')
      }
    }

    if (project.role === 'admin' || project.role === 'viewer') {
      return t('project.locked.descSharedProject')
    }

    return t('project.locked.descGenericIssue')
  }, [t, user, project])

  return (
    <div className='px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8'>
      <div className='mx-auto max-w-max'>
        <main className='sm:flex'>
          <LockClosedIcon className='mb-2 -ml-1.5 h-12 w-auto text-yellow-400 sm:m-0 sm:h-24 dark:text-yellow-600' />
          <div className='sm:ml-6'>
            <div className='sm:border-l sm:border-gray-200 sm:pl-6'>
              <h1 className='text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl dark:text-gray-50'>
                {t('project.locked.title')}
              </h1>
              <p className='mt-1 max-w-prose text-base whitespace-pre-line text-gray-700 dark:text-gray-300'>
                {message}
                {project.role === 'owner' && (
                  <>
                    <br />
                    <br />
                    {t('project.locked.resolve')}
                  </>
                )}
              </p>
            </div>
            {project.role === 'owner' && (
              <div className='mt-8 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6'>
                <Link
                  to={routes.billing}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden'
                >
                  {t('project.locked.manageSubscription')}
                </Link>
                <Link
                  to={routes.contact}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700 dark:focus:ring-gray-50'
                >
                  {t('notFoundPage.support')}
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default LockedDashboard
