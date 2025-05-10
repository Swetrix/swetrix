import { Switch } from '@headlessui/react'
import cx from 'clsx'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { setFeatureFlags } from '~/api'
import { withAuthentication, auth } from '~/hoc/protected'
import { FeatureFlag } from '~/lib/models/User'
import { useAuth } from '~/providers/AuthProvider'
import Loader from '~/ui/Loader'

const FeatureFlagsPage = () => {
  const { t } = useTranslation('common')
  const { user, isLoading, mergeUser } = useAuth()
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [initialised, setInitialised] = useState(false)

  useEffect(() => {
    if (isLoading || initialised || !user) {
      return
    }

    setFlags(user.featureFlags ?? [])
    setInitialised(true)
  }, [isLoading, user, initialised])

  const handleToggle = async (flag: FeatureFlag) => {
    try {
      const newFlags = flags.includes(flag) ? flags.filter((f) => f !== flag) : [...flags, flag]

      await setFeatureFlags(newFlags)
      setFlags(newFlags)
      mergeUser({ featureFlags: newFlags })
      toast.success(t('featureFlags.updated'))
    } catch (error) {
      console.error('Failed to update feature flags:', error)
      toast.error(t('featureFlags.error'))
    }
  }

  if (isLoading) {
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
                  <h3 className='text-lg leading-6 font-medium text-gray-900 dark:text-gray-50'>
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
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden',
                  )}
                >
                  <span
                    aria-hidden='true'
                    className={cx(
                      flags.includes(flag) ? 'translate-x-5' : 'translate-x-0',
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white ring-0 transition duration-200 ease-in-out',
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
