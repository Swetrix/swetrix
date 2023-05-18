import React, { useState, useEffect, memo } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import PropTypes from 'prop-types'
import { useTranslation, Trans } from 'react-i18next'
import _keys from 'lodash/keys'
import _isEmpty from 'lodash/isEmpty'
import _isString from 'lodash/isString'
import _replace from 'lodash/replace'

import Title from 'components/Title'
import { withAuthentication, auth } from 'hoc/protected'
import routes from 'routes'
import Input from 'ui/Input'
import Button from 'ui/Button'
import Checkbox from 'ui/Checkbox'
import {
  isValidEmail, isValidPassword, MIN_PASSWORD_CHARS,
} from 'utils/validator'
import { PROJECTS_PROTECTED, isSelfhosted } from 'redux/constants'
import { checkPassword, submit2FA } from 'api'
import { setItem } from 'utils/localstorage'
import { setAccessToken, removeAccessToken } from 'utils/accessToken'
import { setRefreshToken, removeRefreshToken } from 'utils/refreshToken'

interface IProjectProtectedPasswordForm {
  password: string,
}

interface IProjectProtectedPassword {
  //
}

const ProjectProtectedPassword = (): JSX.Element => {
  const { t }: {
    t: (key: string, optinions?: {
      [key: string]: string | number,
    }) => string,
  } = useTranslation('common')
  const [form, setForm] = useState<IProjectProtectedPasswordForm>({
    password: '',
  })
  const [validated, setValidated] = useState<boolean>(false)
  const [errors, setErrors] = useState<{
    password?: string,
  }>({})
  const { id }: {
    id: string
  } = useParams()
  const [beenSubmitted, setBeenSubmitted] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const history = useHistory()

  const validate = () => {
    const allErrors = {} as {
      password?: string,
    }

    if (!isValidPassword(form.password)) {
      allErrors.password = t('auth.common.xCharsError', { amount: MIN_PASSWORD_CHARS })
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
      await checkPassword(id, data.password)
        .then((res) => {
          if (res) {
            setItem(PROJECTS_PROTECTED, data.password)
            history.push(_replace(routes.project, { id }))
          }
          setErrors({
            password: t('auth.common.wrongPassword'),
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

  const handleInput = ({ target }: {
    target: HTMLInputElement,
  }) => {
    const value = target.type === 'checkbox' ? target.checked : target.value

    setForm(oldForm => ({
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
    history.push(routes.main)
  }

  return (
    <Title title={t('titles.password')}>
      <div className='min-h-page bg-gray-50 dark:bg-slate-900 flex flex-col py-6 px-4 sm:px-6 lg:px-8'>
        <form className='max-w-7xl w-full mx-auto' onSubmit={handleSubmit}>
          <h2 className='mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50'>
            {t('auth.signin.title')}
          </h2>
          <Input
            name='password'
            id='password'
            type='password'
            label={t('auth.common.password')}
            hint={t('auth.common.hint', { amount: MIN_PASSWORD_CHARS })}
            value={form.password}
            placeholder={t('auth.common.password')}
            className='mt-4'
            onChange={handleInput}
            error={beenSubmitted && errors.password}
          />
          <div className='mt-2'>
            <Button className='mr-2 border-indigo-100 dark:text-gray-50 dark:border-slate-700/50 dark:bg-slate-800 dark:hover:bg-slate-700' onClick={onCancel} secondary regular>
              {t('common.cancel')}
            </Button>
            <Button type='submit' loading={isLoading} primary regular>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </div>
    </Title>
  )
}

export default memo(ProjectProtectedPassword)
