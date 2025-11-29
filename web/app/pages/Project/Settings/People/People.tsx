import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/solid'
import cx from 'clsx'
import dayjs from 'dayjs'
import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import { Trash2Icon, UserRoundPlusIcon } from 'lucide-react'
import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { deleteShareProjectUsers, shareProject, changeShareRole } from '~/api'
import useOnClickOutside from '~/hooks/useOnClickOutside'
import { roles, INVITATION_EXPIRES_IN, isSelfhosted } from '~/lib/constants'
import { Role } from '~/lib/models/Organisation'
import { Project, ShareOwnerProject } from '~/lib/models/Project'
import PaidFeature from '~/modals/PaidFeature'
import { useAuth } from '~/providers/AuthProvider'
import { Badge } from '~/ui/Badge'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import Modal from '~/ui/Modal'
import { isValidEmail } from '~/utils/validator'

const NoPeople = () => {
  const { t } = useTranslation('common')

  return (
    <div className='flex flex-col py-6 sm:px-6 lg:px-8'>
      <div className='mx-auto w-full max-w-7xl text-gray-900 dark:text-gray-50'>
        <h2 className='mb-8 px-4 text-center text-xl leading-snug'>{t('project.settings.noPeople')}</h2>
      </div>
    </div>
  )
}

interface TableUserRowProps {
  data: ShareOwnerProject
  onRemove: () => void
  language: string
  authedUserEmail: string | undefined
  reloadProject: () => Promise<void>
}

const TableUserRow = ({ data, onRemove, language, authedUserEmail, reloadProject }: TableUserRowProps) => {
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(false)
  const openRef = useRef<HTMLUListElement>(null)
  useOnClickOutside(openRef, () => setOpen(false))
  const { id, created, confirmed, role, user } = data || {}

  const changeRole = async (newRole: string) => {
    try {
      await changeShareRole(id, { role: newRole })
      await reloadProject()
      toast.success(t('apiNotifications.roleUpdated'))
    } catch (reason) {
      console.error(`[ERROR] Error while updating user's role: ${reason}`)
      toast.error(t('apiNotifications.roleUpdateError'))
    }

    setOpen(false)
  }

  return (
    <tr className='bg-white hover:bg-gray-50 dark:bg-slate-900 dark:hover:bg-slate-800/50'>
      <td className='px-4 py-3 text-sm whitespace-nowrap text-gray-900 dark:text-gray-100'>{user?.email || 'N/A'}</td>
      <td className='px-4 py-3 text-sm whitespace-nowrap text-gray-900 dark:text-gray-100'>
        {language === 'en'
          ? dayjs(created).locale(language).format('MMMM D, YYYY')
          : dayjs(created).locale(language).format('D MMMM, YYYY')}
      </td>
      <td className='px-4 py-3 text-right text-sm whitespace-nowrap'>
        {confirmed ? (
          <div>
            <button
              onClick={() => setOpen(!open)}
              type='button'
              disabled={user?.email === authedUserEmail}
              className='inline-flex items-center rounded-full border border-gray-200 bg-white py-0.5 pr-1 pl-2 text-sm leading-5 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-80 dark:border-gray-600 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-gray-600'
            >
              {t(`project.settings.roles.${role}.name`)}
              <ChevronDownIcon style={{ transform: open ? 'rotate(180deg)' : '' }} className='ml-0.5 h-4 w-4 pt-px' />
            </button>
            {open ? (
              <ul
                ref={openRef}
                className='absolute right-0 z-10 mt-2 w-72 origin-top-right divide-y divide-gray-200 rounded-md bg-white text-left focus:outline-hidden dark:divide-gray-700 dark:bg-slate-900'
              >
                {_map(roles, (itRole, index) => (
                  <li
                    onClick={() => changeRole(itRole)}
                    className={cx(
                      'group flex cursor-pointer items-center justify-between p-4 hover:bg-indigo-600',
                      index === 0 && 'rounded-t-md',
                    )}
                    key={itRole}
                  >
                    <div>
                      <p className='font-bold text-gray-700 group-hover:text-gray-200 dark:text-gray-200'>
                        {t(`project.settings.roles.${itRole}.name`)}
                      </p>
                      <p className='mt-1 text-sm text-gray-500 group-hover:text-gray-200'>
                        {t(`project.settings.roles.${itRole}.shortDesc`)}
                      </p>
                    </div>
                    {role === itRole ? (
                      <span className='text-indigo-600 group-hover:text-gray-200'>
                        <CheckIcon className='ml-1 h-7 w-7 pt-px' />
                      </span>
                    ) : null}
                  </li>
                ))}
                <li
                  onClick={onRemove}
                  className='group flex cursor-pointer items-center justify-between rounded-b-md p-4 hover:bg-gray-200 dark:hover:bg-gray-700'
                >
                  <p className='font-bold text-red-600 dark:text-red-500'>{t('project.settings.removeMember')}</p>
                </li>
              </ul>
            ) : null}
          </div>
        ) : (
          <div className='flex items-center justify-end'>
            <Badge colour='yellow' className='mr-3' label={t('common.pending')} />
            <Button
              type='button'
              className='rounded-md bg-white text-base font-medium text-indigo-700 hover:bg-indigo-50 dark:border-gray-600 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
              small
              onClick={onRemove}
            >
              <Trash2Icon className='h-4 w-4' strokeWidth={1.5} />
            </Button>
          </div>
        )}
      </td>
    </tr>
  )
}

interface PeopleProps {
  project: Project
  reloadProject: () => Promise<void>
}

const People = ({ project, reloadProject }: PeopleProps) => {
  const { user: currentUser } = useAuth()

  const [showModal, setShowModal] = useState(false)
  const [isPaidFeatureOpened, setIsPaidFeatureOpened] = useState(false)
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const [form, setForm] = useState<{
    email: string
    role: Role
  }>({
    email: '',
    role: 'viewer',
  })
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [errors, setErrors] = useState<{
    email?: string
    role?: string
  }>({})
  const [validated, setValidated] = useState(false)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<ShareOwnerProject | null>(null)

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
      await shareProject(id, { email: form.email, role: form.role })
      await reloadProject()
      toast.success(t('apiNotifications.userInvited'))
    } catch (reason) {
      console.error(`[ERROR] Error while inviting a user: ${reason}`)
      toast.error(typeof reason === 'string' ? reason : t('apiNotifications.userInviteError'))
    }

    // a timeout is needed to prevent the flicker of data fields in the modal when closing
    setTimeout(() => setForm({ email: '', role: 'viewer' }), 300)
  }

  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
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
    setTimeout(() => setForm({ email: '', role: 'viewer' }), 300)
    setErrors({})
  }

  const onRemove = async (member: ShareOwnerProject) => {
    if (isDeleting) {
      return
    }

    setIsDeleting(true)

    try {
      await deleteShareProjectUsers(id, member.id)
      await reloadProject()
      toast.success(t('apiNotifications.userRemoved'))
    } catch (reason) {
      console.error(`[ERROR] Error while deleting a user: ${reason}`)
      toast.error(t('apiNotifications.userRemoveError'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div>
      <div className='mb-3 flex items-center justify-between'>
        <div>
          <h3 className='flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'>
            {t('project.settings.people')}
          </h3>
          <p className='text-sm text-gray-500 dark:text-gray-400'>{t('project.settings.inviteCoworkers')}</p>
        </div>
        <Button className='h-8 pl-2' primary regular type='button' onClick={() => setShowModal(true)}>
          <>
            <UserRoundPlusIcon className='mr-1 h-5 w-5' strokeWidth={1.5} />
            {t('project.settings.invite')}
          </>
        </Button>
      </div>
      <div>
        {_isEmpty(share) ? (
          <NoPeople />
        ) : (
          <div className='overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700'>
            <table className='min-w-full divide-y divide-gray-200 dark:divide-slate-700'>
              <thead className='bg-gray-50 dark:bg-slate-800'>
                <tr>
                  <th
                    scope='col'
                    className='px-4 py-3 text-left text-xs font-bold tracking-wider text-gray-900 uppercase dark:text-white'
                  >
                    {t('auth.common.email')}
                  </th>
                  <th
                    scope='col'
                    className='px-4 py-3 text-left text-xs font-bold tracking-wider text-gray-900 uppercase dark:text-white'
                  >
                    {t('profileSettings.sharedTable.joinedOn')}
                  </th>
                  <th scope='col' />
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 bg-white dark:divide-slate-700 dark:bg-slate-900'>
                {_map(share, (data) => (
                  <TableUserRow
                    data={data}
                    key={data.id}
                    onRemove={() => {
                      setMemberToRemove(data)
                      setShowDeleteModal(true)
                    }}
                    language={language}
                    authedUserEmail={currentUser?.email}
                    reloadProject={reloadProject}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <PaidFeature isOpened={isPaidFeatureOpened} onClose={() => setIsPaidFeatureOpened(false)} />
      <Modal
        onClose={() => {
          setShowDeleteModal(false)
          setMemberToRemove(null)
        }}
        onSubmit={() => {
          setShowDeleteModal(false)
          onRemove(memberToRemove!)
        }}
        submitText={t('common.yes')}
        type='confirmed'
        closeText={t('common.no')}
        title={t('project.settings.removeUser', { user: memberToRemove?.user?.email })}
        message={t('project.settings.removeConfirm')}
        isOpened={showDeleteModal}
        isLoading={isDeleting}
      />
      <Modal
        onClose={closeModal}
        customButtons={
          <button
            type='button'
            className='inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white hover:bg-indigo-700 sm:ml-3 sm:w-auto sm:text-sm'
            onClick={handleSubmit}
          >
            {t('common.invite')}
          </button>
        }
        closeText={t('common.cancel')}
        message={
          <div>
            <h2 className='text-xl font-bold text-gray-700 dark:text-gray-200'>
              {t('project.settings.inviteTo', { project: name })}
            </h2>
            <p className='mt-2 text-base text-gray-700 dark:text-gray-200'>
              {t(isSelfhosted ? 'project.settings.inviteDescSelfhosted' : 'project.settings.inviteDesc')}
            </p>
            <p className='mt-2 text-base text-gray-700 dark:text-gray-200'>
              {t('project.settings.inviteExpity', { amount: INVITATION_EXPIRES_IN })}
            </p>
            <Input
              name='email'
              type='email'
              label={t('auth.common.email')}
              value={form.email}
              placeholder='you@example.com'
              className='mt-4'
              onChange={handleInput}
              error={beenSubmitted ? errors.email : null}
            />
            <fieldset className='mt-4'>
              {}
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300' htmlFor='role'>
                {t('project.settings.role')}
              </label>
              <div
                className={cx('mt-1 -space-y-px rounded-md bg-white dark:bg-slate-900', {
                  'border border-red-300': errors.role,
                })}
              >
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label
                  className={cx(
                    'relative flex cursor-pointer rounded-tl-md rounded-tr-md border border-gray-200 p-4 dark:border-slate-600',
                    {
                      'z-10 border-indigo-200 bg-indigo-50 dark:border-indigo-800/40 dark:bg-indigo-600/40':
                        form.role === 'admin',
                      'border-gray-200': form.role !== 'admin',
                    },
                  )}
                >
                  <input
                    name='role'
                    className='h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500'
                    id='role_admin'
                    type='radio'
                    value='admin'
                    onChange={handleInput}
                    checked={form.role === 'admin'}
                  />
                  <div className='ml-3 flex flex-col'>
                    <span
                      className={cx('block text-sm font-medium', {
                        'text-indigo-900 dark:text-white': form.role === 'admin',
                        'text-gray-700 dark:text-gray-200': form.role !== 'admin',
                      })}
                    >
                      {t('project.settings.roles.admin.name')}
                    </span>
                    <span
                      className={cx('block text-sm', {
                        'text-indigo-700 dark:text-gray-100': form.role === 'admin',
                        'text-gray-700 dark:text-gray-200': form.role !== 'admin',
                      })}
                    >
                      {t('project.settings.roles.admin.desc')}
                    </span>
                  </div>
                </label>
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label
                  className={cx(
                    'relative flex cursor-pointer rounded-br-md rounded-bl-md border border-gray-200 p-4 dark:border-gray-500',
                    {
                      'z-10 border-indigo-200 bg-indigo-50 dark:border-indigo-800/40 dark:bg-indigo-600/40':
                        form.role === 'viewer',
                      'border-gray-200': form.role !== 'viewer',
                    },
                  )}
                >
                  <input
                    name='role'
                    className='h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500'
                    id='role_viewer'
                    type='radio'
                    value='viewer'
                    onChange={handleInput}
                    checked={form.role === 'viewer'}
                  />
                  <div className='ml-3 flex flex-col'>
                    <span
                      className={cx('block text-sm font-medium', {
                        'text-indigo-900 dark:text-white': form.role === 'viewer',
                        'text-gray-700 dark:text-gray-200': form.role !== 'viewer',
                      })}
                    >
                      {t('project.settings.roles.viewer.name')}
                    </span>
                    <span
                      className={cx('block text-sm', {
                        'text-indigo-700 dark:text-gray-100': form.role === 'viewer',
                        'text-gray-700 dark:text-gray-200': form.role !== 'viewer',
                      })}
                    >
                      {t('project.settings.roles.viewer.desc')}
                    </span>
                  </div>
                </label>
              </div>
              {errors.role ? (
                <p className='mt-2 text-sm text-red-600 dark:text-red-500' id='email-error'>
                  {errors.role}
                </p>
              ) : null}
            </fieldset>
          </div>
        }
        isOpened={showModal}
      />
    </div>
  )
}

export default People
