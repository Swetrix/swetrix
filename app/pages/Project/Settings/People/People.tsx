import React, { useState, useEffect, useRef } from 'react'
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/solid'
import { TrashIcon, UserPlusIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import cx from 'clsx'
import PropTypes from 'prop-types'
import dayjs from 'dayjs'
import _keys from 'lodash/keys'
import _isEmpty from 'lodash/isEmpty'
import _filter from 'lodash/filter'
import _map from 'lodash/map'

import { deleteShareProjectUsers, shareProject, changeShareRole } from 'api'
import { isValidEmail } from 'utils/validator'
import Input from 'ui/Input'
import { Badge } from 'ui/Badge'
import Button from 'ui/Button'
import Modal from 'ui/Modal'
import PaidFeature from 'modals/PaidFeature'
import { roles, roleViewer, roleAdmin, INVITATION_EXPIRES_IN } from 'redux/constants'
import useOnClickOutside from 'hooks/useOnClickOutside'
import { IProject, IShareOwnerProject } from 'redux/models/IProject'
import { IUser } from 'redux/models/IUser'

const NoEvents = ({ t }: { t: (key: string) => string }): JSX.Element => (
  <div className='flex flex-col py-6 sm:px-6 lg:px-8'>
    <div className='max-w-7xl w-full mx-auto text-gray-900 dark:text-gray-50'>
      <h2 className='text-xl mb-8 text-center leading-snug px-4'>{t('project.settings.noPeople')}</h2>
    </div>
  </div>
)

interface IUsersList {
  data: IShareOwnerProject
  onRemove: (id: string) => void
  t: (
    key: string,
    options?: {
      [key: string]: string | number | null
    },
  ) => string
  share?: IShareOwnerProject[]
  setProjectShareData: (item: Partial<IProject>, id: string, shared: boolean) => void
  pid: string
  updateProjectFailed: (message: string) => void
  language: string
  roleUpdatedNotification: (email: string, role?: string) => void
  authedUserEmail: string | undefined
  isSharedProject: boolean
}

const UsersList = ({
  data,
  onRemove,
  t,
  share,
  setProjectShareData,
  pid,
  updateProjectFailed,
  language,
  roleUpdatedNotification,
  authedUserEmail,
  isSharedProject,
}: IUsersList) => {
  const [open, setOpen] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const openRef = useRef<HTMLDivElement>(null)
  useOnClickOutside(openRef, () => setOpen(false))
  const { id, created, confirmed, role, user } = data

  const changeRole = async (newRole: string) => {
    try {
      const results = await changeShareRole(id, { role: newRole })
      const newShared: IShareOwnerProject[] = _map(share, (itShare) => {
        if (itShare.id === results.id) {
          return { ...results, user: itShare.user, role: newRole }
        }
        return itShare
      })
      setProjectShareData({ share: newShared }, pid, isSharedProject)
      roleUpdatedNotification(t('apiNotifications.roleUpdated'))
    } catch (e) {
      console.error(`[ERROR] Error while updating user's role: ${e}`)
      updateProjectFailed(t('apiNotifications.roleUpdateError'))
    }

    setOpen(false)
  }

  return (
    <tr className='dark:bg-slate-800'>
      <td className='whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6'>
        {user.email}
      </td>
      <td className='whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-white'>
        {language === 'en'
          ? dayjs(created).locale(language).format('MMMM D, YYYY')
          : dayjs(created).locale(language).format('D MMMM, YYYY')}
      </td>
      <td className='relative whitespace-nowrap py-4 text-right text-sm font-medium pr-2'>
        {confirmed ? (
          <div ref={openRef}>
            <button
              onClick={() => setOpen(!open)}
              type='button'
              disabled={user.email === authedUserEmail}
              className='inline-flex disabled:opacity-80 disabled:cursor-not-allowed items-center shadow-sm pl-2 pr-1 py-0.5 border border-gray-200 dark:border-gray-600 text-sm leading-5 font-medium rounded-full bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
            >
              {t(`project.settings.roles.${role}.name`)}
              <ChevronDownIcon style={{ transform: open ? 'rotate(180deg)' : '' }} className='w-4 h-4 pt-px ml-0.5' />
            </button>
            {open && (
              <ul className='text-left origin-top-right absolute z-10 right-0 mt-2 w-72 rounded-md shadow-lg bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-700 focus:outline-none'>
                {_map(roles, (itRole) => (
                  <li
                    onClick={() => changeRole(itRole)}
                    className='p-4 hover:bg-indigo-600 group cursor-pointer flex justify-between items-center'
                    key={itRole}
                  >
                    <div>
                      <p className='font-bold text-gray-700 dark:text-gray-200 group-hover:text-gray-200'>
                        {t(`project.settings.roles.${itRole}.name`)}
                      </p>
                      <p className='mt-1 text-sm text-gray-500 group-hover:text-gray-200'>
                        {t(`project.settings.roles.${itRole}.shortDesc`)}
                      </p>
                    </div>
                    {role === itRole && (
                      <span className='text-indigo-600 group-hover:text-gray-200'>
                        <CheckIcon className='w-7 h-7 pt-px ml-1' />
                      </span>
                    )}
                  </li>
                ))}
                <li
                  onClick={() => {
                    setOpen(false)
                    setShowDeleteModal(true)
                  }}
                  className='p-4 hover:bg-gray-200 dark:hover:bg-gray-700 group cursor-pointer flex justify-between items-center'
                >
                  <div>
                    <p className='font-bold text-red-600 dark:text-red-500'>{t('project.settings.removeMember')}</p>
                  </div>
                </li>
              </ul>
            )}
          </div>
        ) : (
          <div className='flex items-center justify-end'>
            <Badge colour='yellow' className='mr-3' label={t('common.pending')} />
            <Button
              type='button'
              className='bg-white text-indigo-700 rounded-md text-base font-medium hover:bg-indigo-50 dark:text-gray-50 dark:border-gray-600 dark:bg-slate-800 dark:hover:bg-slate-700'
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
          title={t('project.settings.removeUser', { user: user.email })}
          message={t('project.settings.removeConfirm')}
          isOpened={showDeleteModal}
        />
      </td>
    </tr>
  )
}

UsersList.propTypes = {
  share: PropTypes.arrayOf(PropTypes.object).isRequired, // eslint-disable-line react/forbid-prop-types
  data: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  pid: PropTypes.string.isRequired,
  onRemove: PropTypes.func.isRequired,
  updateProjectFailed: PropTypes.func.isRequired,
  language: PropTypes.string.isRequired,
}

UsersList.defaultProps = {
  data: {},
}

interface IPeopleProps {
  project: IProject
  updateProjectFailed: (error: string) => void
  setProjectShareData: (data: Partial<IProject>, projectId: string, share?: boolean) => void
  roleUpdatedNotification: (email: string, role?: string) => void
  inviteUserNotification: (email: string, type?: string) => void
  removeUserNotification: (email: string) => void
  isPaidTierUsed: boolean
  user: IUser
  isSharedProject: boolean
}

const People: React.FunctionComponent<IPeopleProps> = ({
  project,
  updateProjectFailed,
  setProjectShareData,
  roleUpdatedNotification,
  inviteUserNotification,
  removeUserNotification,
  isPaidTierUsed,
  user: currentUser,
  isSharedProject,
}: IPeopleProps): JSX.Element => {
  const [showModal, setShowModal] = useState<boolean>(false)
  const [isPaidFeatureOpened, setIsPaidFeatureOpened] = useState<boolean>(false)
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const [form, setForm] = useState({
    email: '',
    role: '',
  })
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [errors, setErrors] = useState<{
    email?: string
    role?: string
  }>({})
  const [validated, setValidated] = useState(false)
  const { id, name, share } = project

  const validate = () => {
    const allErrors: {
      email?: string
      role?: string
    } = {}

    if (!isValidEmail(form.email)) {
      allErrors.email = t('auth.common.badEmailError')
    }

    if (_isEmpty(form.role)) {
      allErrors.role = t('project.settings.errorNoRole')
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

  const handleInput = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    const value = target.type === 'checkbox' ? target.checked : target.value

    setForm((oldForm) => ({
      ...oldForm,
      [target.name]: value,
    }))
  }

  const onSubmit = async () => {
    setShowModal(false)
    setErrors({})
    setValidated(false)

    try {
      const results = await shareProject(id, { email: form.email, role: form.role })
      setProjectShareData({ share: results.share }, id)
      inviteUserNotification(t('apiNotifications.userInvited'))
    } catch (e) {
      console.error(`[ERROR] Error while inviting a user: ${e}`)
      inviteUserNotification(t('apiNotifications.userInviteError'), 'error')
    }

    // a timeout is needed to prevent the flicker of data fields in the modal when closing
    setTimeout(() => setForm({ email: '', role: '' }), 300)
  }

  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isPaidTierUsed) {
      setIsPaidFeatureOpened(true)
      return
    }

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
    setTimeout(() => setForm({ email: '', role: '' }), 300)
    setErrors({})
  }

  const onRemove = async (userId: string) => {
    try {
      await deleteShareProjectUsers(id, userId)
      const newShared = _map(
        _filter(share, (s) => s.id !== userId),
        (s) => s,
      )
      setProjectShareData({ share: newShared }, id)
      removeUserNotification(t('apiNotifications.userRemoved'))
    } catch (e) {
      console.error(`[ERROR] Error while deleting a user: ${e}`)
      updateProjectFailed(t('apiNotifications.userRemoveError'))
    }
  }

  return (
    <div className='mt-6 mb-6'>
      <div className='flex justify-between items-center mb-3'>
        <div>
          <h3 className='flex items-center mt-2 text-lg font-bold text-gray-900 dark:text-gray-50'>
            {t('project.settings.people')}
          </h3>
          <p className='text-sm text-gray-500 dark:text-gray-400'>{t('project.settings.inviteCoworkers')}</p>
        </div>
        <Button className='h-8 pl-2' primary regular type='button' onClick={() => setShowModal(true)}>
          <>
            <UserPlusIcon className='w-5 h-5 mr-1' />
            {t('project.settings.invite')}
          </>
        </Button>
      </div>
      <div>
        {_isEmpty(share) ? (
          <NoEvents t={t} />
        ) : (
          <div className='mt-3 flex flex-col'>
            <div className='-my-2 -mx-4 overflow-x-auto md:overflow-x-visible sm:-mx-6 lg:-mx-8'>
              <div className='inline-block min-w-full py-2 md:px-6 lg:px-8'>
                <div className='shadow ring-1 ring-black ring-opacity-5 md:rounded-lg'>
                  <table className='min-w-full divide-y divide-gray-300 dark:divide-gray-600'>
                    <thead>
                      <tr className='dark:bg-slate-800'>
                        <th
                          scope='col'
                          className='py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 dark:text-white'
                        >
                          {t('auth.common.email')}
                        </th>
                        <th
                          scope='col'
                          className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white'
                        >
                          {t('profileSettings.sharedTable.joinedOn')}
                        </th>
                        <th scope='col' />
                        <th scope='col' />
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-300 dark:divide-gray-600'>
                      {_map(share, (user) => (
                        <UsersList
                          data={user}
                          key={user.id}
                          onRemove={onRemove}
                          t={t}
                          language={language}
                          share={project.share}
                          setProjectShareData={setProjectShareData}
                          updateProjectFailed={updateProjectFailed}
                          roleUpdatedNotification={roleUpdatedNotification}
                          pid={id}
                          authedUserEmail={currentUser?.email}
                          isSharedProject={isSharedProject}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <PaidFeature isOpened={isPaidFeatureOpened} onClose={() => setIsPaidFeatureOpened(false)} />
      <Modal
        onClose={closeModal}
        customButtons={
          <button
            type='button'
            className={cx(
              'w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm bg-indigo-600 hover:bg-indigo-700',
              {
                'opacity-80 !px-3': !isPaidTierUsed,
              },
            )}
            onClick={handleSubmit}
          >
            {!isPaidTierUsed && <CurrencyDollarIcon className='w-5 h-5 mr-1' />}
            {t('common.invite')}
          </button>
        }
        closeText={t('common.cancel')}
        message={
          <div>
            <h2 className='text-xl font-bold text-gray-700 dark:text-gray-200'>
              {t('project.settings.inviteTo', { project: name })}
            </h2>
            <p className='mt-2 text-base text-gray-700 dark:text-gray-200'>{t('project.settings.inviteDesc')}</p>
            <p className='mt-2 text-base text-gray-700 dark:text-gray-200'>
              {t('project.settings.inviteExpity', { amount: INVITATION_EXPIRES_IN })}
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
                {t('project.settings.role')}
              </label>
              <div
                className={cx('mt-1 bg-white rounded-md -space-y-px dark:bg-slate-900', {
                  'border-red-300 border': errors.role,
                })}
              >
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label
                  className={cx(
                    'dark:border-gray-500 rounded-tl-md rounded-tr-md relative border p-4 flex cursor-pointer border-gray-200',
                    {
                      'bg-indigo-50 border-indigo-200 dark:bg-indigo-500 dark:border-indigo-800 z-10':
                        form.role === roleAdmin.role,
                      'border-gray-200': form.role !== roleAdmin.role,
                    },
                  )}
                >
                  <input
                    name='role'
                    className='focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300'
                    id='role_admin'
                    type='radio'
                    value='admin'
                    onChange={handleInput}
                  />
                  <div className='ml-3 flex flex-col'>
                    <span
                      className={cx('block text-sm font-medium', {
                        'text-indigo-900 dark:text-white': form.role === roleAdmin.role,
                        'text-gray-700 dark:text-gray-200': form.role !== roleAdmin.role,
                      })}
                    >
                      {t('project.settings.roles.admin.name')}
                    </span>
                    <span
                      className={cx('block text-sm', {
                        'text-indigo-700 dark:text-gray-100': form.role === roleAdmin.role,
                        'text-gray-700 dark:text-gray-200': form.role !== roleAdmin.role,
                      })}
                    >
                      {t('project.settings.roles.admin.desc')}
                    </span>
                  </div>
                </label>
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label
                  className={cx(
                    'dark:border-gray-500 rounded-bl-md rounded-br-md relative border p-4 flex cursor-pointer border-gray-200',
                    {
                      'bg-indigo-50 border-indigo-200 dark:bg-indigo-500 dark:border-indigo-800 z-10':
                        form.role === roleViewer.role,
                      'border-gray-200': form.role !== roleViewer.role,
                    },
                  )}
                >
                  <input
                    name='role'
                    className='focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300'
                    id='role_viewer'
                    type='radio'
                    value='viewer'
                    onChange={handleInput}
                  />
                  <div className='ml-3 flex flex-col'>
                    <span
                      className={cx('block text-sm font-medium', {
                        'text-indigo-900 dark:text-white': form.role === roleViewer.role,
                        'text-gray-700 dark:text-gray-200': form.role !== roleViewer.role,
                      })}
                    >
                      {t('project.settings.roles.viewer.name')}
                    </span>
                    <span
                      className={cx('block text-sm', {
                        'text-indigo-700 dark:text-gray-100': form.role === roleViewer.role,
                        'text-gray-700 dark:text-gray-200': form.role !== roleViewer.role,
                      })}
                    >
                      {t('project.settings.roles.viewer.desc')}
                    </span>
                  </div>
                </label>
              </div>
              {errors.role && (
                <p className='mt-2 text-sm text-red-600 dark:text-red-500' id='email-error'>
                  {errors.role}
                </p>
              )}
            </fieldset>
          </div>
        }
        isOpened={showModal}
      />
    </div>
  )
}

People.propTypes = {
  // @ts-ignore
  // eslint-disable-next-line react/forbid-prop-types
  project: PropTypes.object.isRequired,
  updateProjectFailed: PropTypes.func.isRequired,
  setProjectShareData: PropTypes.func.isRequired,
  roleUpdatedNotification: PropTypes.func.isRequired,
  inviteUserNotification: PropTypes.func.isRequired,
  removeUserNotification: PropTypes.func.isRequired,
}

export default People
