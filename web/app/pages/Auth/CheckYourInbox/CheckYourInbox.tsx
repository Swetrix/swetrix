import { EnvelopeIcon } from '@heroicons/react/24/outline'
import { useMemo, useEffect } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { useNavigate } from 'react-router'

import { withAuthentication } from '~/hoc/protected'
import { useAuth } from '~/providers/AuthProvider'
import Loader from '~/ui/Loader'
import routes from '~/utils/routes'

const CheckYourInbox = () => {
  const { t } = useTranslation('common')
  const { user, isLoading, logout } = useAuth()
  const navigate = useNavigate()

  const message = useMemo(() => {
    return t('auth.confirm.linkSent', { email: user?.email })
  }, [t, user?.email])

  useEffect(() => {
    if (user?.isActive) {
      navigate(routes.dashboard)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.isActive])

  if (isLoading) {
    return (
      <div className='min-h-min-footer bg-gray-50 dark:bg-slate-900'>
        <Loader />
      </div>
    )
  }

  if (user?.isActive) {
    return <></>
  }

  return (
    <div className='min-h-min-footer bg-gray-50 px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8 dark:bg-slate-900'>
      <div className='mx-auto max-w-max'>
        <main className='sm:flex'>
          <EnvelopeIcon className='mb-2 -ml-1.5 h-12 w-auto text-indigo-500 sm:m-0 sm:h-24 dark:text-indigo-600' />
          <div className='sm:ml-6'>
            <div className='sm:border-l sm:border-gray-200 sm:pl-6'>
              <h1 className='text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl dark:text-gray-50'>
                {t('auth.confirm.title')}
              </h1>
              <p className='mt-1 max-w-prose font-mono text-base whitespace-pre-line text-gray-700 dark:text-gray-300'>
                {message}
              </p>
              <p className='mt-4 max-w-prose font-mono text-sm whitespace-pre-line text-gray-700 dark:text-gray-300'>
                {t('auth.confirm.spam')}
              </p>
              <p className='max-w-prose font-mono text-sm whitespace-pre-line text-gray-700 dark:text-gray-300'>
                <Trans
                  t={t}
                  i18nKey='auth.confirm.wrongEmail'
                  components={{
                    url: (
                      <span
                        tabIndex={0}
                        role='button'
                        className='cursor-pointer font-medium text-indigo-600 hover:underline dark:text-indigo-400'
                        onClick={() => {
                          logout()
                        }}
                      />
                    ),
                  }}
                />
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default withAuthentication(CheckYourInbox, {
  shouldBeAuthenticated: true,
  redirectPath: routes.signup,
})
