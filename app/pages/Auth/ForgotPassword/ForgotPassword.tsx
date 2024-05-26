import React, { useState, useEffect, memo } from 'react'
import { Link, useNavigate } from '@remix-run/react'
import { useTranslation, Trans } from 'react-i18next'
import _keys from 'lodash/keys'
import _isEmpty from 'lodash/isEmpty'

import { forgotPassword } from 'api'
import { withAuthentication, auth } from 'hoc/protected'
import routes from 'routesPath'
import Input from 'ui/Input'
import Button from 'ui/Button'
import { TRIAL_DAYS } from 'redux/constants'
import { isValidEmail } from 'utils/validator'

const ForgotPassword = ({
  createNewPasswordFailed,
  newPassword,
}: {
  createNewPasswordFailed: (e: string) => void
  newPassword: (message: string) => void
}): JSX.Element => {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const [form, setForm] = useState<{
    email: string
  }>({
    email: '',
  })
  const [validated, setValidated] = useState<boolean>(false)
  const [errors, setErrors] = useState<{
    email?: string
  }>({})
  const [beenSubmitted, setBeenSubmitted] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const validate = () => {
    const allErrors = {} as {
      email?: string
    }

    if (!isValidEmail(form.email)) {
      allErrors.email = t('auth.common.badEmailError')
    }

    const valid = _isEmpty(_keys(allErrors))

    setErrors(allErrors)
    setValidated(valid)
  }

  useEffect(() => {
    validate()
  }, [form]) // eslint-disable-line

  const onSubmit = async (data: { email: string }) => {
    if (!isLoading) {
      setIsLoading(true)

      try {
        await forgotPassword(data)

        newPassword(t('auth.forgot.sent'))
        navigate(routes.main)
      } catch (e: any) {
        createNewPasswordFailed(e.toString())
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleInput = ({ target }: { target: HTMLInputElement }) => {
    const value = target.type === 'checkbox' ? target.checked : target.value

    setForm((oldForm) => ({
      ...oldForm,
      [target.name]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setBeenSubmitted(true)

    if (validated) {
      onSubmit(form)
    }
  }

  return (
    <div>
      <div className='min-h-min-footer bg-gray-50 dark:bg-slate-900 flex flex-col py-6 px-4 sm:px-6 lg:px-8'>
        <div className='sm:mx-auto sm:w-full sm:max-w-md'>
          <h2 className='text-center text-2xl font-bold leading-9 tracking-tight text-gray-900 dark:text-gray-50'>
            {t('titles.recovery')}
          </h2>
        </div>
        <div className='mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]'>
          <div className='bg-white dark:bg-slate-800/20 dark:ring-1 dark:ring-slate-800 px-6 py-12 shadow sm:rounded-lg sm:px-12'>
            <form className='space-y-6' onSubmit={handleSubmit}>
              <Input
                name='email'
                id='email'
                type='email'
                label={t('auth.common.email')}
                value={form.email}
                onChange={handleInput}
                error={beenSubmitted && errors.email}
              />
              <Button className='w-full justify-center' type='submit' loading={isLoading} primary giant>
                {t('auth.forgot.reset')}
              </Button>
            </form>
          </div>
          <p className='mt-10 mb-4 text-center text-sm text-gray-500 dark:text-gray-200'>
            <Trans
              // @ts-ignore
              t={t}
              i18nKey='auth.signin.notAMember'
              components={{
                // eslint-disable-next-line jsx-a11y/anchor-has-content
                url: (
                  <Link
                    to={routes.signup}
                    className='font-semibold leading-6 text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'
                    aria-label={t('footer.tos')}
                  />
                ),
              }}
              values={{
                amount: TRIAL_DAYS,
              }}
            />
          </p>
        </div>
      </div>
    </div>
  )
}

export default memo(withAuthentication(ForgotPassword, auth.notAuthenticated))
