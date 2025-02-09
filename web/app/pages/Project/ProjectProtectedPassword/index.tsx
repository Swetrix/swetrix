import React, { useState, useEffect, memo } from 'react'
import { Link, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import _keys from 'lodash/keys'
import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import _replace from 'lodash/replace'

import routes from '~/utils/routes'
import Input from '~/ui/Input'
import Button from '~/ui/Button'
import { checkPassword } from '~/api'
import { useDispatch } from 'react-redux'
import UIActions from '~/lib/reducers/ui'
import Header from '~/components/Header'
import Footer from '~/components/Footer'
import { useRequiredParams } from '~/hooks/useRequiredParams'

interface ProjectProtectedPasswordForm {
  password: string
}

const MAX_PASSWORD_LENGTH = 80

interface ProjectProtectedPasswordProps {
  ssrTheme: 'light' | 'dark'
  embedded: boolean
  isAuth: boolean
}

const ProjectProtectedPassword = ({ ssrTheme, embedded, isAuth }: ProjectProtectedPasswordProps) => {
  const { t } = useTranslation('common')
  const [form, setForm] = useState<ProjectProtectedPasswordForm>({
    password: '',
  })
  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState<{
    password?: string
  }>({})
  const { id } = useRequiredParams<{ id: string }>()
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const dispatch = useDispatch()

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
    if (!isLoading) {
      setIsLoading(true)
      await checkPassword(id, data.password)
        .then((result) => {
          if (result) {
            dispatch(
              UIActions.setProjectPassword({
                id,
                password: data.password,
              }),
            )
            navigate({
              pathname: _replace(routes.project, ':id', id),
              search: `?embedded=${embedded}&theme=${ssrTheme}`,
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
      {!embedded && <Header ssrTheme={ssrTheme} authenticated={isAuth} />}
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
            error={beenSubmitted && errors.password}
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
      {!embedded && <Footer authenticated={isAuth} />}
    </>
  )
}

export default memo(ProjectProtectedPassword)
