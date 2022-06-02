import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Input from 'ui/Input'
import { isValidEmail } from 'utils/validator'
import _keys from 'lodash/keys'
import _isEmpty from 'lodash/isEmpty'

const AddUser = ({ projectName }) => {
  const { t } = useTranslation('common')
  const [form, setForm] = useState({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [errors, setErrors] = useState({})
  const [validated, setValidated] = useState(false)

  const validate = () => {
    const allErrors = {}

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

  const handleInput = ({ target }) => {
    const value = target.type === 'checkbox' ? target.checked : target.value

    setForm(oldForm => ({
      ...oldForm,
      [target.name]: value,
    }))
  }
  const onSubmit = () => {
    console.log('work')
  }
  const handleSubmit = e => {
    e.preventDefault()
    e.stopPropagation()
    setBeenSubmitted(true)

    if (validated) {
      onSubmit(form)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className='text-xl font-bold text-gray-700 dark:text-gray-200'>
        Invite member to
        {' '}
        {projectName}
      </h2>
      <p className='mt-2 text-base text-gray-700 dark:text-gray-200'>
        Enter the email address and role of the person you want to invite. We
        will contact them over email to offer them access to ads analytics.
      </p>
      <p className='mt-2 text-base text-gray-700 dark:text-gray-200'>
        The invitation will expire in 48 hours
      </p>
      <Input
        name='email'
        id='email'
        type='email'
        label={t('auth.common.email')}
        value={form.email}
        placeholder='you@example.com'
        className='mt-4'
        onChange={handleInput}
        error={beenSubmitted && errors.email}
      />
    </form>
  )
}

export default AddUser
