import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import React, { useState, useEffect } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { forgotPassword } from '~/api'
import { withAuthentication, auth } from '~/hoc/protected'
import { TRIAL_DAYS } from '~/lib/constants'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import routes from '~/utils/routes'
import { isValidEmail } from '~/utils/validator'

const ForgotPassword = () => {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const [form, setForm] = useState<{
    email: string
  }>({
    email: '',
  })
  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState<{
    email?: string
  }>({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

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

        toast.success(t('auth.forgot.sent'))
        navigate(routes.main)
      } catch (reason: any) {
        toast.error(reason.toString())
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
      <div className='min-h-min-footer flex flex-col bg-gray-50 px-4 py-6 sm:px-6 lg:px-8 dark:bg-slate-900'>
        <div className='sm:mx-auto sm:w-full sm:max-w-md'>
          <h2 className='text-center text-2xl leading-9 font-bold text-gray-900 dark:text-gray-50'>
            {t('titles.recovery')}
          </h2>
        </div>
        <div className='mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]'>
          <div className='bg-white px-6 py-12 shadow-xs ring-1 ring-gray-200 sm:rounded-lg sm:px-12 dark:bg-slate-900 dark:ring-slate-800'>
            <form className='space-y-6' onSubmit={handleSubmit}>
              <Input
                name='email'
                type='email'
                label={t('auth.common.email')}
                value={form.email}
                onChange={handleInput}
                error={beenSubmitted ? errors.email : null}
              />
              <Button className='w-full justify-center' type='submit' loading={isLoading} primary giant>
                {t('auth.forgot.reset')}
              </Button>
            </form>
          </div>
          <p className='mt-10 mb-4 text-center text-sm text-gray-500 dark:text-gray-200'>
            <Trans
              t={t}
              i18nKey='auth.signin.notAMember'
              components={{
                url: (
                  <Link
                    to={routes.signup}
                    className='leading-6 font-semibold text-indigo-600 hover:underline dark:text-indigo-400'
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

export default withAuthentication(ForgotPassword, auth.notAuthenticated)
