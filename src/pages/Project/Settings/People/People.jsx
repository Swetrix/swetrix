import React, { useState, useEffect } from 'react'
import Button from 'ui/Button'
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/solid'
import { TrashIcon } from '@heroicons/react/outline'
import { ActivePin } from 'ui/Pin'
import Modal from 'ui/Modal'
import { useTranslation } from 'react-i18next'
import Input from 'ui/Input'
import { isValidEmail } from 'utils/validator'
import _keys from 'lodash/keys'
import _isEmpty from 'lodash/isEmpty'
import cx from 'clsx'
import _map from 'lodash/map'
import { deleteShareProjectUsers, shareProject, changeShareRole } from 'api'
import _filter from 'lodash/filter'
import PropTypes from 'prop-types'

const roles = [
  {
    name: 'Admin',
    role: 'admin',
    description: 'Can manage the project',
  },
  {
    name: 'Viewer',
    role: 'viewer',
    description: 'Can view the project',
  },
]

const NoEvents = () => (
  <div className='flex flex-col py-6 sm:px-6 lg:px-8'>
    <div className='max-w-7xl w-full mx-auto text-gray-900 dark:text-gray-50'>
      <h2 className='text-2xl mb-8 text-center leading-snug'>
        No people have been added to this project yet.
      </h2>
    </div>
  </div>
)

const UsersList = ({ data, onRemove }) => {
  const [open, setOpen] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const changeRole = async (role) => {
    await changeShareRole(data.id, { role })
      .then((results) => {
        console.log(results)
        setOpen(false)
      })
      .catch((e) => {
        console.log(e)
        setOpen(false)
      })
  }
  return (
    <li className='py-4'>
      <div className='flex justify-between'>
        <p className='text-gray-700 dark:text-gray-200'>
          {data.user.email}
        </p>
        <div className={cx('relative', { 'flex items-center': !data.confirmed })}>
          {
        !data.confirmed ? (
          <>
            <ActivePin
              label='Pannding'
              className='inline-flex items-center shadow-sm px-2.5 py-0.5 mr-3'
            />
            <Button
              type='button'
              className='bg-white text-indigo-600 border border-transparent rounded-md text-base font-medium hover:bg-indigo-50 dark:text-gray-50 dark:border-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600'
              small
              onClick={() => { setShowDeleteModal(true) }}
            >
              <TrashIcon className='h-4 w-4' />
            </Button>
          </>
        ) : (
          <>
            <button
              onClick={() => setOpen(!open)}
              type='button'
              className='inline-flex items-center shadow-sm pl-2 pr-1 py-0.5 border border-gray-200 dark:border-gray-500 text-sm leading-5 font-medium rounded-full bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
            >
              { data.role }
              <ChevronDownIcon
                style={{ transform: open ? 'rotate(180deg)' : '' }}
                className='w-4 h-4 pt-px ml-0.5'
              />
            </button>
            {open && (
            <ul className='origin-top-right absolute z-10 right-0 mt-2 w-72 rounded-md shadow-lg overflow-hidden bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 focus:outline-none'>
              {_map(roles, ({ name, role, description }) => (
                <li onClick={() => changeRole(role)} className='p-4 hover:bg-indigo-600 group cursor-pointer flex justify-between items-center' key={role}>
                  <div>
                    <p className='font-bold text-gray-700 dark:text-gray-200 group-hover:text-gray-200'>
                      {name}
                    </p>
                    <p className='mt-1 text-sm text-gray-500 group-hover:text-gray-200'>
                      {description}
                    </p>
                  </div>
                  { data.role === role && (
                  <span className='text-indigo-600 group-hover:text-gray-200'>
                    <CheckIcon className='w-7 h-7 pt-px ml-1' />
                  </span>
                  )}
                </li>
              ))}
              <li onClick={() => { setOpen(false); setShowDeleteModal(true) }} className='p-4 hover:bg-gray-900 group cursor-pointer flex justify-between items-center'>
                <div>
                  <p className='font-bold text-red-600 group-hover:text-red-600'>
                    Remove member
                  </p>
                </div>
              </li>
            </ul>
            )}
          </>
        )
      }
        </div>
      </div>
      <Modal
        onClose={() => {
          setShowDeleteModal(false)
        }}
        onSubmit={() => {
          setShowDeleteModal(false)
          onRemove(data.id)
        }}
        submitText='Yes'
        type='confirmed'
        closeText='No'
        title={`Delete user: ${data.id}?`}
        message='Are you sure you want to delete this user?'
        isOpened={showDeleteModal}
      />
    </li>
  )
}

UsersList.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  data: PropTypes.object.isRequired,
  onRemove: PropTypes.func,
}

UsersList.defaultProps = {
  onRemove: () => {},
}

const People = ({
  project, updateProjectFailed, setProjectShare,
}) => {
  const [showModal, setShowModal] = useState(false)
  const { t } = useTranslation('common')
  const [form, setForm] = useState({
    email: '',
    role: '',
  })
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [errors, setErrors] = useState({})
  const [validated, setValidated] = useState(false)
  const { id, name, share } = project

  const validate = () => {
    const allErrors = {}

    if (!isValidEmail(form.email)) {
      allErrors.email = t('auth.common.badEmailError')
    }

    if (form.role === '') {
      allErrors.role = 'Please select a role.'
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

  const onSubmit = () => {
    setShowModal(false)
    setForm({ email: '', role: '' })
    setErrors({})
    setValidated(false)
    shareProject(id, { email: form.email, role: form.role })
      .then((results) => {
        setProjectShare(results.share, id)
      })
      .catch((e) => {
        updateProjectFailed(e)
      })
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
    setForm({ email: '', role: '' })
    setErrors({})
  }

  const onRemove = userId => {
    deleteShareProjectUsers(id, userId)
      .then(() => {
        const newShared = _map(_filter(share, s => s.id !== userId), s => s)
        setProjectShare(newShared, id)
      })
      .catch((e) => {
        updateProjectFailed(e)
      })
  }

  return (
    <div className='mt-6 mb-6'>
      <div className='flex justify-between items-center mb-3'>
        <div>
          <h3 className='mt-2 text-lg font-bold text-gray-900 dark:text-gray-50'>
            People
          </h3>
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            Invite your coworkers
          </p>
        </div>
        <Button
          className='h-8'
          primary
          regular
          type='button'
          onClick={() => setShowModal(true)}
        >
          Add Users
        </Button>
      </div>
      <div>
        {
          _isEmpty(share) ? (
            <NoEvents />
          ) : (
            <ul className='divide-y divide-gray-200 dark:divide-gray-700'>
              {_map(share, user => (<UsersList data={user} key={user.id} onRemove={onRemove} />))}
            </ul>
          )
        }
      </div>
      <Modal
        onClose={closeModal}
        onSubmit={handleSubmit}
        submitText='Add'
        closeText={t('common.no')}
        message={(
          <div>
            <h2 className='text-xl font-bold text-gray-700 dark:text-gray-200'>
              Invite member to
              {' '}
              {name}
            </h2>
            <p className='mt-2 text-base text-gray-700 dark:text-gray-200'>
              Enter the email address and role of the person you want to invite.
              We will contact them over email to offer them access to ads
              analytics.
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
            <fieldset className='mt-4'>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300' htmlFor='role'>Role</label>
              <div className={cx('mt-1 bg-white rounded-md -space-y-px dark:bg-gray-800', { 'border-red-300 border': errors.role })}>
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label className={cx('dark:border-gray-500 rounded-tl-md rounded-tr-md relative border p-4 flex cursor-pointer border-gray-200', { 'bg-indigo-50 border-indigo-200 dark:bg-indigo-500 dark:border-indigo-800 z-10': form.role === 'admin', 'border-gray-200': form.role !== 'admin' })}>
                  <input
                    name='role'
                    className='focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300'
                    id='role_admin'
                    type='radio'
                    value='admin'
                    onChange={handleInput}
                  />
                  <div className='ml-3 flex flex-col'>
                    <span className={cx('block text-sm font-medium', { 'text-indigo-900 dark:text-white': form.role === 'admin', 'text-gray-700 dark:text-gray-200': form.role !== 'admin' })}>
                      Admin
                    </span>
                    <span className={cx('block text-sm', { 'text-indigo-700 dark:text-gray-100': form.role === 'admin', 'text-gray-700 dark:text-gray-200': form.role !== 'admin' })}>
                      Can view stats, change site settings and invite other members
                    </span>
                  </div>
                </label>
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label className={cx('dark:border-gray-500 rounded-bl-md rounded-br-md relative border p-4 flex cursor-pointer border-gray-200', { 'bg-indigo-50 border-indigo-200 dark:bg-indigo-500 dark:border-indigo-800 z-10': form.role === 'viewer', 'border-gray-200': form.role !== 'viewer' })}>
                  <input
                    name='role'
                    className='focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300'
                    id='role_viewer'
                    type='radio'
                    value='viewer'
                    onChange={handleInput}
                  />
                  <div className='ml-3 flex flex-col'>
                    <span className={cx('block text-sm font-medium', { 'text-indigo-900 dark:text-white': form.role === 'viewer', 'text-gray-700 dark:text-gray-200': form.role !== 'viewer' })}>
                      Viewer
                    </span>
                    <span className={cx('block text-sm', { 'text-indigo-700 dark:text-gray-100': form.role === 'viewer', 'text-gray-700 dark:text-gray-200': form.role !== 'viewer' })}>
                      Can view stats but cannot access settings or invite members
                    </span>
                  </div>
                </label>
              </div>
              {errors.role && (
                <p className='mt-2 text-sm text-red-600 dark:text-red-500' id='email-error'>{errors.role}</p>
              )}
            </fieldset>
          </div>
        )}
        isOpened={showModal}
      />
    </div>
  )
}

People.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  project: PropTypes.object.isRequired,
  updateProjectFailed: PropTypes.func,
  setProjectShare: PropTypes.func,
}

People.defaultProps = {
  updateProjectFailed: () => {},
  setProjectShare: () => {},
}

export default People
