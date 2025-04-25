import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _size from 'lodash/size'
import React, { useState, useEffect } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

import { createNewPassword } from '~/api'
import { withAuthentication, auth } from '~/hoc/protected'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import routes from '~/utils/routes'
import { isValidPassword, MIN_PASSWORD_CHARS, MAX_PASSWORD_CHARS } from '~/utils/validator'

interface FormSubmitData {
  password: string
  repeat: string
}

const CreateNewPassword = () => {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { id } = useParams()
  const [form, setForm] = useState<FormSubmitData>({
    password: '',
    repeat: '',
  })
  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState<{
    password?: string
    repeat?: string
  }>({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const validate = () => {
    const allErrors = {} as {
      password?: string
      repeat?: string
    }

    if (!isValidPassword(form.password)) {
      allErrors.password = t('auth.common.xCharsError', { amount: MIN_PASSWORD_CHARS })
    }

    if (form.password !== form.repeat || form.repeat === '') {
      allErrors.repeat = t('auth.common.noMatchError')
    }

    if (_size(form.password) > 50) {
      allErrors.password = t('auth.common.passwordTooLong', { amount: MAX_PASSWORD_CHARS })
    }

    const valid = _isEmpty(_keys(allErrors))

    setErrors(allErrors)
    setValidated(valid)
  }

  useEffect(() => {
    validate()
  }, [form]) // eslint-disable-line

  const onSubmit = async (data: FormSubmitData) => {
    if (!isLoading) {
      setIsLoading(true)
      try {
        const { password } = data
        await createNewPassword(id as string, password)

        toast.success(t('auth.recovery.updated'))
        navigate(routes.signin)
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
          <h2 className='text-center text-2xl leading-9 font-bold tracking-tight text-gray-900 dark:text-gray-50'>
            {t('auth.recovery.title')}
          </h2>
        </div>
        <div className='mt-10 font-mono sm:mx-auto sm:w-full sm:max-w-[480px]'>
          <div className='bg-white px-6 py-12 shadow-xs ring-1 ring-gray-200 sm:rounded-lg sm:px-12 dark:bg-slate-800/20 dark:ring-slate-800'>
            <form className='space-y-6' onSubmit={handleSubmit}>
              <Input
                name='password'
                type='password'
                label={t('auth.recovery.newPassword')}
                hint={t('auth.common.hint', { amount: MIN_PASSWORD_CHARS })}
                value={form.password}
                onChange={handleInput}
                error={beenSubmitted ? errors.password : null}
              />
              <Input
                name='repeat'
                type='password'
                label={t('auth.common.repeat')}
                value={form.repeat}
                onChange={handleInput}
                error={beenSubmitted ? errors.repeat : null}
              />
              <Button className='w-full justify-center' type='submit' loading={isLoading} primary giant>
                {t('auth.recovery.save')}
              </Button>
            </form>
          </div>
          <p className='mt-10 mb-4 text-center text-sm text-gray-500 dark:text-gray-200'>
            <Trans
              t={t}
              i18nKey='auth.signup.alreadyAMember'
              components={{
                url: (
                  <Link
                    to={routes.signin}
                    className='leading-6 font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'
                    aria-label={t('footer.tos')}
                  />
                ),
              }}
            />
          </p>
        </div>
      </div>
    </div>
  )
}

export default withAuthentication(CreateNewPassword, auth.notAuthenticated)
