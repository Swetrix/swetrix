import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _replace from 'lodash/replace'
import _size from 'lodash/size'
import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { checkPassword } from '~/api'
import Footer from '~/components/Footer'
import Header from '~/components/Header'
import { useRequiredParams } from '~/hooks/useRequiredParams'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import routes from '~/utils/routes'

import { setProjectPassword } from '../View/utils/cache'

interface ProjectProtectedPasswordForm {
  password: string
}

const MAX_PASSWORD_LENGTH = 80

const ProjectProtectedPassword = () => {
  const { t } = useTranslation('common')
  const [form, setForm] = useState<ProjectProtectedPasswordForm>({
    password: '',
  })
  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState<{
    password?: string
  }>({})
  const { pid } = useRequiredParams<{ pid: string }>()
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const isEmbedded = searchParams.get('embedded') === 'true'

  const validate = () => {
    const allErrors = {} as {
      password?: string
    }

    if (_isEmpty(form.password)) {
      allErrors.password = t('apiNotifications.enterPassword')
    }

    if (_size(form.password) >= MAX_PASSWORD_LENGTH) {
      allErrors.password = t('auth.common.passwordTooLong', { amount: MAX_PASSWORD_LENGTH })
    }

    const valid = _isEmpty(_keys(allErrors))

    setErrors(allErrors)
    setValidated(valid)
  }

  useEffect(() => {
    validate()
  }, [form]) // eslint-disable-line

  const onSubmit = async (data: ProjectProtectedPasswordForm) => {
    if (isLoading) {
      return
    }

    setIsLoading(true)
    await checkPassword(pid, data.password)
      .then((result) => {
        if (result) {
          const searchParamsObj = new URLSearchParams()

          if (searchParams.has('theme')) {
            searchParamsObj.set('theme', searchParams.get('theme')!)
          }

          if (searchParams.has('embedded')) {
            searchParamsObj.set('embedded', searchParams.get('embedded')!)
          }

          const searchString = searchParamsObj.toString()
          const search = searchString ? `?${searchString}` : undefined

          setProjectPassword(pid, data.password)
          navigate({
            pathname: _replace(routes.project, ':id', pid),
            search,
          })
          return
        }
        setErrors({
          password: t('apiNotifications.incorrectPassword'),
        })
      })
      .catch(console.error)
      .finally(() => {
        setIsLoading(false)
      })
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
    <>
      {!isEmbedded ? <Header /> : null}
      <div className='min-h-page flex flex-col bg-gray-50 px-4 py-6 sm:px-6 lg:px-8 dark:bg-slate-900'>
        <form className='mx-auto w-full max-w-7xl' onSubmit={handleSubmit}>
          <h2 className='mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50'>{t('titles.passwordProtected')}</h2>
          <Input
            name='password'
            type='password'
            label={t('auth.common.password')}
            value={form.password}
            placeholder={t('auth.common.password')}
            className='mt-4'
            onChange={handleInput}
            error={beenSubmitted ? errors.password : null}
          />
          <div className='mt-5'>
            <Button
              className='mr-2 border-indigo-100 dark:border-slate-700/50 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
              as={Link}
              // @ts-expect-error
              to={routes.main}
              secondary
              regular
            >
              {t('common.cancel')}
            </Button>
            <Button type='submit' loading={isLoading} primary regular>
              {t('common.continue')}
            </Button>
          </div>
        </form>
      </div>
      {!isEmbedded ? <Footer /> : null}
    </>
  )
}

export default ProjectProtectedPassword
