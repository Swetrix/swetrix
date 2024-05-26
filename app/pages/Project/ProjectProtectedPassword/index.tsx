import React, { useState, useEffect, memo } from 'react'
import { useNavigate, useParams } from '@remix-run/react'
import { useTranslation } from 'react-i18next'
import _keys from 'lodash/keys'
import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import _replace from 'lodash/replace'

import routes from 'routesPath'
import Input from 'ui/Input'
import Button from 'ui/Button'
import { checkPassword } from 'api'
import { useDispatch } from 'react-redux'
import UIActions from 'redux/reducers/ui'
import Header from 'components/Header'
import Footer from 'components/Footer'

interface IProjectProtectedPasswordForm {
  password: string
}

const MAX_PASSWORD_LENGTH = 80

const ProjectProtectedPassword = ({
  ssrTheme,
  embedded,
  isAuth,
}: {
  ssrTheme: 'light' | 'dark'
  embedded: boolean
  isAuth: boolean
}): JSX.Element => {
  const { t } = useTranslation('common')
  const [form, setForm] = useState<IProjectProtectedPasswordForm>({
    password: '',
  })
  const [validated, setValidated] = useState<boolean>(false)
  const [errors, setErrors] = useState<{
    password?: string
  }>({})
  const { id } = useParams()
  const [beenSubmitted, setBeenSubmitted] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
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

  const onSubmit = async (data: IProjectProtectedPasswordForm) => {
    if (!isLoading) {
      setIsLoading(true)
      await checkPassword(id as string, data.password)
        .then((res) => {
          if (res) {
            dispatch(
              UIActions.setProjectProtectedPassword({
                id: id as string,
                password: data.password,
              }),
            )
            navigate({
              pathname: _replace(routes.project, ':id', id as string),
              search: `?embedded=${embedded}&theme=${ssrTheme}`,
            })
          }
          setErrors({
            password: t('apiNotifications.incorrectPassword'),
          })
        })
        .catch((err) => {
          console.log(err)
        })
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

  const onCancel = () => {
    navigate(routes.main)
  }

  return (
    <>
      {!embedded && <Header ssrTheme={ssrTheme} authenticated={isAuth} />}
      <div className='min-h-page bg-gray-50 dark:bg-slate-900 flex flex-col py-6 px-4 sm:px-6 lg:px-8'>
        <form className='max-w-7xl w-full mx-auto' onSubmit={handleSubmit}>
          <h2 className='mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50'>{t('titles.passwordProtected')}</h2>
          <Input
            name='password'
            id='password'
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
              className='mr-2 border-indigo-100 dark:text-gray-50 dark:border-slate-700/50 dark:bg-slate-800 dark:hover:bg-slate-700'
              onClick={onCancel}
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
      {!embedded && <Footer authenticated={isAuth} minimal />}
    </>
  )
}

export default memo(ProjectProtectedPassword)
