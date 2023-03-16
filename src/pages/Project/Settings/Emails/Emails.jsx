import React, { useState, useEffect, useRef } from 'react'
import {
  TrashIcon, InboxStackIcon, ChevronDownIcon, CheckIcon,
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import dayjs from 'dayjs'
import _keys from 'lodash/keys'
import _isEmpty from 'lodash/isEmpty'
import _filter from 'lodash/filter'
import _map from 'lodash/map'

import {
  addSubscriber, removeSubscriber, getSubscribers, updateSubscriber,
} from 'api'

import { isValidEmail } from 'utils/validator'
import useOnClickOutside from 'hooks/useOnClickOutside'
import { reportFrequencyForEmailsOptions } from 'redux/constants'

import Input from 'ui/Input'
import Button from 'ui/Button'
import Modal from 'ui/Modal'
import Loader from 'ui/Loader'
import cx from 'clsx'
import { WarningPin } from 'ui/Pin'

const ModalMessage = ({
  project, handleInput, beenSubmitted, errors, form, t,
}) => (
  <div>
    <h2 className='text-xl font-bold text-gray-700 dark:text-gray-200'>
      {t('project.settings.inviteTo', { project })}
    </h2>
    <p className='mt-2 text-base text-gray-700 dark:text-gray-200'>
      {t('project.settings.inviteDesc')}
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
    <fieldset className='mt-4'>
      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300' htmlFor='role'>
        {t('project.settings.reportFrequency')}
      </label>
      <div className={cx('mt-1 bg-white rounded-md -space-y-px dark:bg-gray-800', { 'border-red-300 border': errors.reportFrequency })}>
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        {_map(reportFrequencyForEmailsOptions, (item) => (
          <div key={item.value}>
            {/*  eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label className={cx('dark:border-gray-500 rounded-tl-md rounded-tr-md relative border p-4 flex cursor-pointer border-gray-200', { 'bg-indigo-50 border-indigo-200 dark:bg-indigo-500 dark:border-indigo-800 z-10': item.value === form.reportFrequency, 'border-gray-200': form.reportFrequency !== item.value })}>
              <input
                name='reportFrequency'
                className='focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300'
                id='reportFrequency'
                type='radio'
                value={item.value}
                onChange={handleInput}
              />
              <div className='ml-3 flex flex-col'>
                <span className={cx('block text-sm font-medium', { 'text-indigo-900 dark:text-white': form.reportFrequency === item.value, 'text-gray-700 dark:text-gray-200': form.reportFrequency !== item.value })}>
                  {t(`project.settings.reportFrequency.${item.value}`)}
                </span>
                <span className={cx('block text-sm', { 'text-indigo-700 dark:text-gray-100': form.reportFrequency === item.value, 'text-gray-700 dark:text-gray-200': form.reportFrequency !== item.value })}>
                  {t(`project.settings.reportFrequency.${item.value}.desc`)}
                </span>
              </div>
            </label>
          </div>
        ))}
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
      </div>
      {errors.reportFrequency && (
        <p className='mt-2 text-sm text-red-600 dark:text-red-500' id='email-error'>{errors.reportFrequency}</p>
      )}
    </fieldset>
  </div>
)

const EmailList = ({
  data, onRemove, t, setEmails, emailFailed, language, reportTypeNotifiction,
}) => {
  const [open, setOpen] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const openRef = useRef()
  useOnClickOutside(openRef, () => setOpen(false))
  const {
    id, addedAt, isConfirmed, projectId, email, reportFrequency,
  } = data

  const changeRole = async (reportType) => {
    try {
      const results = await updateSubscriber(projectId, id, { reportFrequency: reportType.value })
      setEmails((prev) => {
        const newEmails = _map(prev, (item) => {
          if (item.id === results.id) {
            return results
          }
          return item
        })
        return newEmails
      })
      reportTypeNotifiction(t('apiNotifications.roleUpdated'))
    } catch (e) {
      console.error(`[ERROR] Error while updating user's role: ${e}`)
      emailFailed(t('apiNotifications.roleUpdateError'))
    }

    setOpen(false)
  }

  return (
    <tr className='dark:bg-gray-700'>
      <td className='whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6'>
        {email}
      </td>
      <td className='whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-white'>
        {language === 'en'
          ? dayjs(addedAt).locale(language).format('MMMM D, YYYY')
          : dayjs(addedAt).locale(language).format('D MMMM, YYYY')}
      </td>
      <td className='relative whitespace-nowrap py-4 text-right text-sm font-medium pr-2'>
        {isConfirmed ? (
          <div ref={openRef}>
            <button
              onClick={() => setOpen(!open)}
              type='button'
              className='inline-flex items-center shadow-sm pl-2 pr-1 py-0.5 border border-gray-200 dark:border-gray-600 text-sm leading-5 font-medium rounded-full bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
            >
              {t(`project.settings.roles.${reportFrequency}.name`)}
              <ChevronDownIcon
                style={{ transform: open ? 'rotate(180deg)' : '' }}
                className='w-4 h-4 pt-px ml-0.5'
              />
            </button>
            {open && (
              <ul className='text-left origin-top-right absolute z-10 right-0 mt-2 w-72 rounded-md shadow-lg bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 focus:outline-none'>
                {_map(reportFrequencyForEmailsOptions, (item) => (
                  <li onClick={() => changeRole(item)} className='p-4 hover:bg-indigo-600 group cursor-pointer flex justify-between items-center' key={item.value}>
                    <div>
                      <p className='font-bold text-gray-700 dark:text-gray-200 group-hover:text-gray-200'>
                        {t(`project.settings.roles.${item.label}.name`)}
                      </p>
                    </div>
                    {reportFrequency === item.value && (
                      <span className='text-indigo-600 group-hover:text-gray-200'>
                        <CheckIcon className='w-7 h-7 pt-px ml-1' />
                      </span>
                    )}
                  </li>
                ))}
                <li onClick={() => { setOpen(false); setShowDeleteModal(true) }} className='p-4 hover:bg-gray-200 dark:hover:bg-gray-700 group cursor-pointer flex justify-between items-center'>
                  <div>
                    <p className='font-bold text-red-600 dark:text-red-500'>
                      {t('project.settings.removeMember')}
                    </p>
                  </div>
                </li>
              </ul>
            )}
          </div>
        ) : (
          <div className='flex items-center justify-end'>
            <WarningPin
              label={t('common.pending')}
              className='inline-flex items-center shadow-sm px-2.5 py-0.5 mr-3'
            />
            <Button
              type='button'
              className='bg-white text-indigo-700 rounded-md text-base font-medium hover:bg-indigo-50 dark:text-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600'
              small
              onClick={() => setShowDeleteModal(true)}
            >
              <TrashIcon className='h-4 w-4' />
            </Button>
          </div>
        )}
      </td>
      <td>
        <Modal
          onClose={() => {
            setShowDeleteModal(false)
          }}
          onSubmit={() => {
            setShowDeleteModal(false)
            onRemove(id)
          }}
          submitText={t('common.yes')}
          type='confirmed'
          closeText={t('common.no')}
          title={t('project.settings.removeUser', { user: reportFrequency })}
          message={t('project.settings.removeConfirm')}
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

const NoEvents = ({ t }) => (
  <div className='flex flex-col py-6 sm:px-6 lg:px-8'>
    <div className='max-w-7xl w-full mx-auto text-gray-900 dark:text-gray-50'>
      <h2 className='text-2xl mb-8 text-center leading-snug'>
        {t('project.settings.noPeople')}
      </h2>
    </div>
  </div>
)

const Emails = ({
  emailFailed, addEmail, removeEmail, projectId, projectName, reportTypeNotifiction,
}) => {
  const [showModal, setShowModal] = useState(false)
  const { t, i18n: { language } } = useTranslation('common')
  const [form, setForm] = useState({
    email: '',
    reportFrequency: reportFrequencyForEmailsOptions[3].value,
  })
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [errors, setErrors] = useState({})
  const [validated, setValidated] = useState(false)
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [paggination, setPaggination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  })

  const getSubcribersAsync = async () => {
    try {
      const { subscribers, count } = await getSubscribers(projectId, paggination.page - 1, paggination.limit)
      setPaggination(oldPaggination => ({
        ...oldPaggination,
        count,
      }))
      setEmails(subscribers)
    } catch (e) {
      console.error(`[ERROR] Error while getting subscribers: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getSubcribersAsync()
  }, []) // eslint-disable-line

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
      const results = await addSubscriber(projectId, { reportFrequency: form.reportFrequency, email: form.email })
      setEmails([...emails, results])
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
      await removeSubscriber(projectId, email)
      console.log('email', emails)
      const results = _filter(emails, s => s.id !== email)
      setEmails(results)
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
              {(!loading && !_isEmpty(emails)) && (
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
                          key={email.id}
                          pid={projectId}
                          onRemove={onRemove}
                          t={t}
                          language={language}
                          setEmails={setEmails}
                          removeEmail={removeEmail}
                          emailFailed={emailFailed}
                          reportTypeNotifiction={reportTypeNotifiction}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {_isEmpty(emails) && (
                <NoEvents t={t} />
              )}
              {loading && (
                <Loader />
              )}
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
          <ModalMessage
            t={t}
            project={projectName}
            form={form}
            handleInput={handleInput}
            errors={errors}
            beenSubmitted={beenSubmitted}
            validated={validated}
          />
        )}
        isOpened={showModal}
      />
    </div>
  )
}

Emails.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  emailFailed: PropTypes.func.isRequired,
  addEmail: PropTypes.func.isRequired,
  removeEmail: PropTypes.func.isRequired,
}

export default Emails
