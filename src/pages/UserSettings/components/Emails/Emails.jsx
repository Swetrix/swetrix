import React, { useState, useEffect } from 'react'
import { TrashIcon, InboxStackIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import dayjs from 'dayjs'
import _keys from 'lodash/keys'
import _isEmpty from 'lodash/isEmpty'
import _filter from 'lodash/filter'
import _map from 'lodash/map'

import { addEmailApi, deleteEmailApi } from 'api'
import { isValidEmail } from 'utils/validator'
import Input from 'ui/Input'
import Button from 'ui/Button'
import Modal from 'ui/Modal'

const EmailList = ({
  data, onRemove, t, language,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const {
    created, email,
  } = data

  return (
    <tr className='dark:bg-gray-700'>
      <td className='whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6'>
        {email}
      </td>
      <td className='whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-white'>
        {language === 'en'
          ? dayjs(created).locale(language).format('MMMM D, YYYY')
          : dayjs(created).locale(language).format('D MMMM, YYYY')}
      </td>
      <td className='relative whitespace-nowrap py-4 text-right text-sm font-medium pr-2'>
        <div className='flex items-center justify-end'>
          <Button
            type='button'
            className='bg-white text-indigo-700 rounded-md text-base font-medium hover:bg-indigo-50 dark:text-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600'
            small
            onClick={() => setShowDeleteModal(true)}
          >
            <TrashIcon className='h-4 w-4' />
          </Button>
        </div>
      </td>
      <td>
        <Modal
          onClose={() => {
            setShowDeleteModal(false)
          }}
          onSubmit={() => {
            setShowDeleteModal(false)
            onRemove(email)
          }}
          submitText={t('common.yes')}
          type='confirmed'
          closeText={t('common.no')}
          title={t('user.emails.deleteEmail', { email })}
          message={t('user.emails..email')}
          isOpened={showDeleteModal}
        />
      </td>
    </tr>
  )
}

EmailList.propTypes = {
  data: PropTypes.shape({
    created: PropTypes.string,
    email: PropTypes.string,
  }),
  onRemove: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
  language: PropTypes.string.isRequired,
}

EmailList.defaultProps = {
  data: {},
}

const Emails = ({
  user, emailFailed, setUser, addEmail, removeEmail,
}) => {
  const [showModal, setShowModal] = useState(false)
  const { t, i18n: { language } } = useTranslation('common')
  const [form, setForm] = useState({
    email: '',
  })
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [errors, setErrors] = useState({})
  const [validated, setValidated] = useState(false)
  const emails = user?.emails || [{
    email: 'maksadasd@gmail.com',
    created: '2021-03-03T12:12:12',
  }]

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
    if (showModal) {
      validate()
    }
  }, [form]) // eslint-disable-line

  const handleInput = ({ target }) => {
    const value = target.type === 'checkbox' ? target.checked : target.value

    setForm(oldForm => ({
      ...oldForm,
      [target.name]: value,
    }))
  }

  const onSubmit = async () => {
    setShowModal(false)
    setErrors({})
    setValidated(false)

    try {
      const results = await addEmailApi({ email: form.email })
      setUser({ emails: [...emails, results] })
      addEmail(t('apiNotifications.userInvited'))
    } catch (e) {
      console.error(`[ERROR] Error while inviting a user: ${e}`)
      addEmail(t('apiNotifications.userInviteError'), 'error')
    }

    // a timeout is needed to prevent the flicker of data fields in the modal when closing
    setTimeout(() => setForm({ email: '' }), 300)
  }

  const handleSubmit = e => {
    e.preventDefault()
    e.stopPropagation()

    setBeenSubmitted(true)
    if (validated) {
      onSubmit()
    } else {
      validate()
    }
  }

  const closeModal = () => {
    setShowModal(false)
    // a timeout is needed to prevent the flicker of data fields in the modal when closing
    setTimeout(() => setForm({ email: '' }), 300)
    setErrors({})
  }

  const onRemove = async (email) => {
    try {
      await deleteEmailApi(email)
      const results = _map(_filter(emails, s => s !== email), s => s)
      setUser({ emails: results })
      removeEmail(t('apiNotifications.emailDelete'))
    } catch (e) {
      console.error(`[ERROR] Error while deleting a email: ${e}`)
      emailFailed(t('apiNotifications.emailDeleteError'))
    }
  }

  return (
    <div className='mt-6 mb-6'>
      <div className='flex justify-between items-center mb-3'>
        <div>
          <h3 className='flex items-center mt-2 text-lg font-bold text-gray-900 dark:text-gray-50'>
            {t('user.emails.title')}
          </h3>
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            {t('user.emails.description')}
          </p>
        </div>
        <Button
          className='h-8 pl-2'
          primary
          regular
          type='button'
          onClick={() => setShowModal(true)}
        >
          <InboxStackIcon className='w-5 h-5 mr-1' />
          {t('user.emails.add')}
        </Button>
      </div>
      <div>
        <div className='mt-3 flex flex-col'>
          <div className='-my-2 -mx-4 overflow-x-auto md:overflow-x-visible sm:-mx-6 lg:-mx-8'>
            <div className='inline-block min-w-full py-2 md:px-6 lg:px-8'>
              <div className='shadow ring-1 ring-black ring-opacity-5 md:rounded-lg'>
                <table className='min-w-full divide-y divide-gray-300 dark:divide-gray-600'>
                  <thead>
                    <tr className='dark:bg-gray-700'>
                      <th scope='col' className='py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 dark:text-white'>
                        {t('auth.common.email')}
                      </th>
                      <th scope='col' className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white'>
                        {t('auth.common.email.addOn')}
                      </th>
                      <th scope='col' />
                      <th scope='col' />
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-300 dark:divide-gray-600'>
                    {_map(emails, email => (
                      <EmailList
                        data={email}
                        key={email}
                        onRemove={onRemove}
                        t={t}
                        language={language}
                        setUser={setUser}
                        emailFailed={emailFailed}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Modal
        onClose={closeModal}
        customButtons={(
          <button
            type='button'
            className='w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm bg-indigo-600 hover:bg-indigo-700'
            onClick={handleSubmit}
          >
            {t('common.add')}
          </button>
        )}
        closeText={t('common.cancel')}
        message={(
          <div>
            <h2 className='text-xl font-bold text-gray-700 dark:text-gray-200'>
              Add email
            </h2>
            <p className='mt-2 text-base text-gray-700 dark:text-gray-200'>
              description
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
          </div>
        )}
        isOpened={showModal}
      />
    </div>
  )
}

Emails.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  user: PropTypes.object.isRequired,
  emailFailed: PropTypes.func.isRequired,
  setUser: PropTypes.func.isRequired,
  addEmail: PropTypes.func.isRequired,
  removeEmail: PropTypes.func.isRequired,
}

export default Emails
