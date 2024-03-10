import React, { useMemo, memo, useEffect } from 'react'
import { useNavigate } from '@remix-run/react'
import { useTranslation, Trans } from 'react-i18next'
import { EnvelopeIcon } from '@heroicons/react/24/outline'
import { useSelector, useDispatch } from 'react-redux'

import Loader from 'ui/Loader'
import { withAuthentication } from 'hoc/protected'
import { authActions } from 'redux/reducers/auth'
import sagaActions from 'redux/sagas/actions'
import { StateType, useAppDispatch } from 'redux/store'
import routes from 'routesPath'

const CheckYourInbox = (): JSX.Element => {
  const { t } = useTranslation('common')
  const { loading, user } = useSelector((state: StateType) => state.auth)
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const _dispatch = useDispatch()

  const message = useMemo(() => {
    return t('auth.confirm.linkSent', { email: user?.email })
  }, [t, user?.email])

  useEffect(() => {
    if (user?.isActive) {
      navigate(routes.dashboard)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.isActive])

  if (loading) {
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
    <div className='min-h-min-footer bg-gray-50 dark:bg-slate-900 px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8'>
      <div className='max-w-max mx-auto'>
        <main className='sm:flex'>
          <EnvelopeIcon className='-ml-1.5 mb-2 sm:m-0 h-12 sm:h-24 w-auto text-indigo-500 dark:text-indigo-600' />
          <div className='sm:ml-6'>
            <div className='sm:border-l sm:border-gray-200 sm:pl-6'>
              <h1 className='text-4xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight sm:text-5xl'>
                {t('auth.confirm.title')}
              </h1>
              <p className='mt-1 max-w-prose whitespace-pre-line text-base text-gray-700 dark:text-gray-300'>
                {message}
              </p>
              <p className='mt-4 max-w-prose whitespace-pre-line text-sm text-gray-700 dark:text-gray-300'>
                {t('auth.confirm.spam')}
              </p>
              <p className='max-w-prose whitespace-pre-line text-sm text-gray-700 dark:text-gray-300'>
                <Trans
                  t={t}
                  i18nKey='auth.confirm.wrongEmail'
                  components={{
                    url: (
                      <span
                        role='button'
                        className='cursor-pointer font-medium text-indigo-500 hover:underline hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-500'
                        onClick={() => {
                          dispatch(authActions.logout())
                          _dispatch(sagaActions.logout(false, false))
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

export default memo(
  withAuthentication(CheckYourInbox, {
    shouldBeAuthenticated: true,
    redirectPath: routes.signup,
  }),
)
