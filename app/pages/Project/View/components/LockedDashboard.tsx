import React, { useMemo } from 'react'
import { LockClosedIcon } from '@heroicons/react/24/outline'
import { Link } from '@remix-run/react'
import { IUser, DashboardBlockReason } from 'redux/models/IUser'
import { IProjectForShared } from 'redux/models/ISharedProject'
import { useTranslation } from 'react-i18next'
import routes from 'routesPath'

interface ILockedDashboard {
  user?: IUser
  project: IProjectForShared
  isSharedProject: boolean
}

const LockedDashboard = ({ user, project, isSharedProject }: ILockedDashboard) => {
  const { t } = useTranslation('common')

  const message = useMemo(() => {
    if (project?.isOwner) {
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

    if (isSharedProject) {
      return t('project.locked.descSharedProject')
    }

    return t('project.locked.descGenericIssue')
  }, [t, user, project, isSharedProject])

  return (
    <div className='px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8'>
      <div className='max-w-max mx-auto'>
        <main className='sm:flex'>
          <LockClosedIcon className='-ml-1.5 mb-2 sm:m-0 h-12 sm:h-24 w-auto text-yellow-400 dark:text-yellow-600' />
          <div className='sm:ml-6'>
            <div className='sm:border-l sm:border-gray-200 sm:pl-6'>
              <h1 className='text-4xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight sm:text-5xl'>
                {t('project.locked.title')}
              </h1>
              <p className='mt-1 max-w-prose whitespace-pre-line text-base text-gray-500 dark:text-gray-300'>
                {message}
                {project?.isOwner && (
                  <>
                    <br />
                    <br />
                    {t('project.locked.resolve')}
                  </>
                )}
              </p>
            </div>
            {project?.isOwner && (
              <div className='mt-8 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6'>
                <Link
                  to={routes.billing}
                  className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                >
                  {t('project.locked.manageSubscription')}
                </Link>
                <Link
                  to={routes.contact}
                  className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:text-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700 dark:focus:ring-gray-50'
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
