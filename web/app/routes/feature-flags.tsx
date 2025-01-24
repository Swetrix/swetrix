import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Switch } from '@headlessui/react'
import { toast } from 'sonner'
import cx from 'clsx'

import { StateType } from '~/lib/store'
import { FeatureFlag } from '~/lib/models/User'
import { withAuthentication, auth } from '~/hoc/protected'
import { setFeatureFlags } from '~/api'
import { useNavigate } from '@remix-run/react'
import routes from '~/utils/routes'
import Loader from '~/ui/Loader'
import { authActions } from '~/lib/reducers/auth'

const FeatureFlagsPage = () => {
  const { t } = useTranslation('common')
  const { user, loading } = useSelector((state: StateType) => state.auth)
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [initialised, setInitialised] = useState(false)
  const navigate = useNavigate()
  const dispatch = useDispatch()

  useEffect(() => {
    if (loading || initialised) {
      return
    }

    if (user) {
      setFlags(user.featureFlags)
      setInitialised(true)
      return
    }

    navigate(routes.main)
  }, [loading, user, navigate, initialised])

  const handleToggle = async (flag: FeatureFlag) => {
    try {
      const newFlags = flags.includes(flag) ? flags.filter((f) => f !== flag) : [...flags, flag]

      await setFeatureFlags(newFlags)
      setFlags(newFlags)
      dispatch(authActions.mergeUser({ featureFlags: newFlags }))
      toast.success(t('featureFlags.updated'))
    } catch (error) {
      console.error('Failed to update feature flags:', error)
      toast.error(t('featureFlags.error'))
    }
  }

  if (loading) {
    return (
      <div className='min-h-min-footer bg-gray-50 dark:bg-slate-900'>
        <Loader />
      </div>
    )
  }

  return (
    <div className='min-h-min-footer bg-gray-50 dark:bg-slate-900'>
      <div className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
        <div className='mx-auto max-w-4xl'>
          <h2 className='text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50'>
            {t('featureFlags.title')}
          </h2>
          <p className='mt-4 text-gray-500 dark:text-gray-400'>{t('featureFlags.description')}</p>

          <div className='mt-8 divide-y divide-gray-200 dark:divide-gray-700'>
            {Object.values(FeatureFlag).map((flag) => (
              <div key={flag} className='flex items-center justify-between py-4'>
                <div>
                  <h3 className='text-lg font-medium leading-6 text-gray-900 dark:text-gray-50'>
                    {t(`featureFlags.${flag}.title`)}
                  </h3>
                  <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                    {t(`featureFlags.${flag}.description`, {
                      defaultPeriod: 7,
                    })}
                  </p>
                </div>
                <Switch
                  checked={flags.includes(flag)}
                  onChange={() => handleToggle(flag)}
                  className={cx(
                    flags.includes(flag) ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700',
                    'focus:outline-hidden relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                  )}
                >
                  <span
                    aria-hidden='true'
                    className={cx(
                      flags.includes(flag) ? 'translate-x-5' : 'translate-x-0',
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
                    )}
                  />
                </Switch>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default withAuthentication(FeatureFlagsPage, auth.authenticated)
