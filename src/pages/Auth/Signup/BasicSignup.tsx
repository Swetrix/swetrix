import React, { memo, useState, useEffect } from 'react'
import sagaActions from 'redux/sagas/actions'
import { useTranslation, Trans } from 'react-i18next'
import _size from 'lodash/size'
import _keys from 'lodash/keys'
import _isEmpty from 'lodash/isEmpty'

import Input from 'ui/Input'
import Button from 'ui/Button'
import Checkbox from 'ui/Checkbox'
import Tooltip from 'ui/Tooltip'
import {
  isValidEmail, isValidPassword, MIN_PASSWORD_CHARS, MAX_PASSWORD_CHARS,
} from 'utils/validator'
import { HAVE_I_BEEN_PWNED_URL } from 'redux/constants'
import { trackCustom } from 'utils/analytics'
import { useAppDispatch } from 'redux/store'
import _omit from 'lodash/omit'

const BasicSignup = (): JSX.Element => {
  const { t }: {
    t: (key: string, optinions?: {
      [key: string]: string | number,
    }) => string,
  } = useTranslation('common')
  const dispatch = useAppDispatch()
  const [form, setForm] = useState<{
    email: string,
    password: string,
    repeat: string,
    tos: boolean,
    dontRemember: boolean,
    checkIfLeaked: boolean,
  }>({
    email: '',
    password: '',
    repeat: '',
    tos: true,
    dontRemember: false,
    checkIfLeaked: true,
  })
  const [validated, setValidated] = useState<boolean>(false)
  const [errors, setErrors] = useState<{
    email?: string,
    password?: string,
    repeat?: string,
    tos?: string,
  }>({})
  const [beenSubmitted, setBeenSubmitted] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const onSubmit = (data: {
    email: string,
    password: string,
    repeat: string,
    tos: boolean,
    dontRemember: boolean,
    checkIfLeaked: boolean,
  }) => {
    if (!isLoading) {
      setIsLoading(true)
      dispatch(sagaActions.signupAsync(_omit(data, 'tos'), t, (result) => {
        if (result) {
          trackCustom('SIGNUP_BASIC')
        } else {
          setIsLoading(false)
        }
      }))
    }
  }

  const validate = () => {
    const allErrors = {} as {
      email?: string,
      password?: string,
      repeat?: string,
    }

    if (!isValidEmail(form.email)) {
      allErrors.email = t('auth.common.badEmailError')
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

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { target } = event
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

  return (
    <form className='space-y-6' onSubmit={handleSubmit}>
      <Input
        name='email'
        id='email'
        type='email'
        value={form.email}
        placeholder={t('auth.signup.email')}
        onChange={handleInput}
        error={beenSubmitted && errors.email}
      />
      <Input
        name='password'
        id='password'
        type='password'
        value={form.password}
        placeholder={t('auth.common.password')}
        className='mt-4'
        onChange={handleInput}
        error={beenSubmitted && errors.password}
      />
      <Input
        name='repeat'
        id='repeat'
        type='password'
        value={form.repeat}
        placeholder={t('auth.common.repeat')}
        className='mt-4'
        onChange={handleInput}
        error={beenSubmitted && errors.repeat}
      />
      <div className='flex mt-4'>
        <Checkbox
          checked={form.checkIfLeaked}
          onChange={handleInput}
          name='checkIfLeaked'
          id='checkIfLeaked'
          label={t('auth.common.checkLeakedPassword')}
        />
        <Tooltip
          className='ml-2'
          text={(
            <Trans
              // @ts-ignore
              t={t}
              i18nKey='auth.common.checkLeakedPasswordDesc'
              components={{
                // eslint-disable-next-line jsx-a11y/anchor-has-content
                db: <a href={HAVE_I_BEEN_PWNED_URL} className='font-medium text-indigo-400 hover:underline hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500' target='_blank' rel='noreferrer noopener' />,
              }}
              values={{
                database: 'haveibeenpwned.com',
              }}
            />
          )}
        />
      </div>
      <Button className='w-full flex justify-center' type='submit' loading={isLoading} primary giant>
        {t('auth.signup.create')}
      </Button>
    </form>
  )
}

export default memo(BasicSignup)
