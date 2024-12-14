import React, { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/solid'
import { useTranslation } from 'react-i18next'
import cx from 'clsx'
import dayjs from 'dayjs'
import _keys from 'lodash/keys'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'

import { isValidEmail } from '~/utils/validator'
import Input from '~/ui/Input'
import { Badge } from '~/ui/Badge'
import Button from '~/ui/Button'
import Modal from '~/ui/Modal'
import { roles, INVITATION_EXPIRES_IN } from '~/lib/constants'
import useOnClickOutside from '~/hooks/useOnClickOutside'
import { DetailedOrganisation, Role } from '~/lib/models/Organisation'
import { useSelector } from 'react-redux'
import { StateType } from '~/lib/store'
import { changeOrganisationRole, inviteOrganisationMember, removeOrganisationMember } from '~/api'
import { Trash2Icon, UserRoundPlusIcon } from 'lucide-react'

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

interface UsersListProps {
  members: DetailedOrganisation['members']
  onRemove: (member: DetailedOrganisation['members'][number]) => void
}

const UsersList = ({ members, onRemove }: UsersListProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { user } = useSelector((state: StateType) => state.auth)

  const [roleEditDropdownId, setRoleEditDropdownId] = useState<string | null>(null)
  const openRef = useRef<HTMLUListElement>(null)
  useOnClickOutside(openRef, () => setRoleEditDropdownId(null))

  const changeRole = async (memberId: string, newRole: Role) => {
    try {
      await changeOrganisationRole(memberId, newRole)
      toast.success(t('apiNotifications.roleUpdated'))
    } catch (reason) {
      console.error(`[ERROR] Error while updating user's role: ${reason}`)
      toast.error(typeof reason === 'string' ? reason : t('apiNotifications.roleUpdateError'))
    }

    setRoleEditDropdownId(null)
  }

  return members.map((member) => (
    <tr key={member.id} className='dark:bg-slate-800'>
      <td className='whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6'>
        {member.user.email}
      </td>
      <td className='whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-white'>
        {language === 'en'
          ? dayjs(member.created).locale(language).format('MMMM D, YYYY')
          : dayjs(member.created).locale(language).format('D MMMM, YYYY')}
      </td>
      <td className='relative whitespace-nowrap py-4 pr-2 text-right text-sm font-medium'>
        {member.confirmed ? (
          <div>
            <button
              onClick={() => setRoleEditDropdownId((prev) => (prev === member.id ? null : member.id))}
              type='button'
              disabled={member.user.email === user.email || member.role === 'owner'}
              className='inline-flex items-center rounded-full border border-gray-200 bg-white py-0.5 pl-2 pr-1 text-sm font-medium leading-5 text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-80 dark:border-gray-600 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-gray-600'
            >
              {t(`organisations.role.${member.role}.name`)}
              <ChevronDownIcon
                style={{ transform: roleEditDropdownId === member.id ? 'rotate(180deg)' : '' }}
                className='ml-0.5 h-4 w-4 pt-px'
              />
            </button>
            {roleEditDropdownId === member.id ? (
              <ul
                ref={openRef}
                className='absolute right-0 z-10 mt-2 w-72 origin-top-right divide-y divide-gray-200 rounded-md bg-white text-left shadow-lg focus:outline-none dark:divide-gray-700 dark:bg-slate-900'
              >
                {_map(roles, (itRole, index) => (
                  <li
                    onClick={() => changeRole(member.id, itRole)}
                    className={cx(
                      'group relative cursor-pointer p-4 hover:bg-indigo-600',
                      index === 0 && 'rounded-t-md',
                    )}
                    key={itRole}
                  >
                    <div className='flex justify-between'>
                      <p className='truncate font-bold text-gray-700 group-hover:text-gray-200 dark:text-gray-200'>
                        {t(`organisations.role.${itRole}.name`)}
                      </p>
                      {member.role === itRole && (
                        <span className='ml-3 flex-none text-indigo-600 group-hover:text-gray-200'>
                          <CheckIcon className='size-5' />
                        </span>
                      )}
                    </div>
                    <p className='mt-1 whitespace-normal text-sm text-gray-500 group-hover:text-gray-200'>
                      {t(`organisations.role.${itRole}.desc`)}
                    </p>
                  </li>
                ))}
                <li
                  onClick={() => {
                    onRemove(member)
                    setRoleEditDropdownId(null)
                  }}
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
              onClick={() => onRemove(member)}
            >
              <Trash2Icon className='h-4 w-4' strokeWidth={1.5} />
            </Button>
          </div>
        )}
      </td>
    </tr>
  ))
}

interface PeopleProps {
  organisation: DetailedOrganisation
  reloadOrganisation: () => Promise<void>
}

const People = ({ organisation, reloadOrganisation }: PeopleProps) => {
  const [showModal, setShowModal] = useState(false)
  const { t } = useTranslation('common')
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
  const [memberToRemove, setMemberToRemove] = useState<DetailedOrganisation['members'][number] | null>(null)

  const { name, members } = organisation

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

  const onInviteToOrganisation = async () => {
    setShowModal(false)
    setErrors({})
    setValidated(false)

    try {
      await inviteOrganisationMember(organisation.id, form)
      await reloadOrganisation()
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
      onInviteToOrganisation()
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

  const closeRemoveUserModal = () => {
    setShowDeleteModal(false)
    setTimeout(() => setMemberToRemove(null), 300)
  }

  const onRemove = async (member: DetailedOrganisation['members'][number]) => {
    if (isDeleting) {
      return
    }

    setIsDeleting(true)

    try {
      await removeOrganisationMember(member.id)
      await reloadOrganisation()

      toast.success(t('apiNotifications.orgUserRemoved'))
    } catch (reason) {
      console.error(`[ERROR] Error while removing user from the organisation: ${reason}`)
      toast.error(typeof reason === 'string' ? reason : t('apiNotifications.orgUserRemoveError'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className='mb-6 mt-6'>
      <div className='mb-3 flex items-center justify-between'>
        <div>
          <h3 className='mt-2 flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'>
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
        {_isEmpty(members) ? (
          <NoPeople />
        ) : (
          <div className='mt-3 flex flex-col'>
            <div className='-mx-4 -my-2 overflow-x-auto sm:-mx-6 md:overflow-x-visible lg:-mx-8'>
              <div className='inline-block min-w-full py-2 md:px-6 lg:px-8'>
                <div className='shadow ring-1 ring-black ring-opacity-5 md:rounded-lg'>
                  <table className='min-w-full divide-y divide-gray-300 dark:divide-gray-600'>
                    <thead>
                      <tr className='dark:bg-slate-800'>
                        <th
                          scope='col'
                          className='py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6'
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
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-300 dark:divide-gray-600'>
                      <UsersList
                        members={members}
                        onRemove={(member) => {
                          setMemberToRemove(member)
                          setShowDeleteModal(true)
                        }}
                      />
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Modal
        onClose={closeRemoveUserModal}
        onSubmit={async () => {
          await onRemove(memberToRemove!)
          closeRemoveUserModal()
        }}
        submitText={t('common.yes')}
        type='confirmed'
        closeText={t('common.no')}
        title={t('project.settings.removeUser', { user: memberToRemove?.user.email })}
        message={t('project.settings.removeConfirm')}
        isOpened={showDeleteModal}
        isLoading={isDeleting}
      />
      <Modal
        onClose={closeModal}
        customButtons={
          <button
            type='button'
            className='inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 sm:ml-3 sm:w-auto sm:text-sm'
            onClick={handleSubmit}
          >
            {t('common.invite')}
          </button>
        }
        closeText={t('common.cancel')}
        message={
          <div>
            <h2 className='text-xl font-bold text-gray-700 dark:text-gray-200'>
              {t('organisations.invite.title', {
                organisation: name,
              })}
            </h2>
            <p className='mt-2 text-base text-gray-700 dark:text-gray-200'>
              {t('organisations.invite.desc', {
                expiresIn: INVITATION_EXPIRES_IN,
              })}
            </p>
            <Input
              name='email'
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
                      {t('organisations.role.admin.name')}
                    </span>
                    <span
                      className={cx('block text-sm', {
                        'text-indigo-700 dark:text-gray-100': form.role === 'admin',
                        'text-gray-700 dark:text-gray-200': form.role !== 'admin',
                      })}
                    >
                      {t('organisations.role.admin.desc')}
                    </span>
                  </div>
                </label>
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label
                  className={cx(
                    'relative flex cursor-pointer rounded-bl-md rounded-br-md border border-gray-200 p-4 dark:border-gray-500',
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
                      {t('organisations.role.viewer.name')}
                    </span>
                    <span
                      className={cx('block text-sm', {
                        'text-indigo-700 dark:text-gray-100': form.role === 'viewer',
                        'text-gray-700 dark:text-gray-200': form.role !== 'viewer',
                      })}
                    >
                      {t('organisations.role.viewer.desc')}
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

export default People
