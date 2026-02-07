import cx from 'clsx'
import dayjs from 'dayjs'
import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import {
  TrashIcon,
  UserCirclePlusIcon,
  CaretDownIcon,
  CheckIcon,
} from '@phosphor-icons/react'
import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import { toast } from 'sonner'

import useOnClickOutside from '~/hooks/useOnClickOutside'
import { roles, INVITATION_EXPIRES_IN } from '~/lib/constants'
import { DetailedOrganisation, Role } from '~/lib/models/Organisation'
import { useAuth } from '~/providers/AuthProvider'
import type { OrganisationSettingsActionData } from '~/routes/organisations.$id'
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
        <h2 className='mb-8 px-4 text-center text-xl leading-snug'>
          {t('project.settings.noPeople')}
        </h2>
      </div>
    </div>
  )
}

interface UsersListProps {
  members: DetailedOrganisation['members']
  onRemove: (member: DetailedOrganisation['members'][number]) => void
  fetcher: ReturnType<typeof useFetcher<OrganisationSettingsActionData>>
}

const UsersList = ({ members, onRemove, fetcher }: UsersListProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { user } = useAuth()

  const [roleEditDropdownId, setRoleEditDropdownId] = useState<string | null>(
    null,
  )
  const openRef = useRef<HTMLUListElement>(null)
  useOnClickOutside(openRef, () => setRoleEditDropdownId(null))

  const changeRole = (memberId: string, newRole: Role) => {
    const formData = new FormData()
    formData.set('intent', 'update-member-role')
    formData.set('memberId', memberId)
    formData.set('role', newRole)
    fetcher.submit(formData, { method: 'post' })
    setRoleEditDropdownId(null)
  }

  return members.map((member) => (
    <tr key={member.id} className='dark:bg-slate-800'>
      <td className='py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-6 dark:text-white'>
        {member.user.email}
      </td>
      <td className='px-3 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-white'>
        {language === 'en'
          ? dayjs(member.created).locale(language).format('MMMM D, YYYY')
          : dayjs(member.created).locale(language).format('D MMMM, YYYY')}
      </td>
      <td className='relative py-4 pr-2 text-right text-sm font-medium whitespace-nowrap'>
        {member.confirmed ? (
          <div>
            <button
              onClick={() =>
                setRoleEditDropdownId((prev) =>
                  prev === member.id ? null : member.id,
                )
              }
              type='button'
              disabled={
                member.user.email === user?.email || member.role === 'owner'
              }
              className='inline-flex items-center rounded-full border border-gray-200 bg-white py-0.5 pr-1 pl-2 text-sm leading-5 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-80 dark:border-gray-600 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-gray-600'
            >
              {t(`organisations.role.${member.role}.name`)}
              <CaretDownIcon
                style={{
                  transform:
                    roleEditDropdownId === member.id ? 'rotate(180deg)' : '',
                }}
                className='ml-0.5 h-4 w-4 pt-px'
              />
            </button>
            {roleEditDropdownId === member.id ? (
              <ul
                ref={openRef}
                className='absolute right-0 z-10 mt-2 w-72 origin-top-right divide-y divide-gray-200 rounded-md bg-white text-left focus:outline-hidden dark:divide-gray-700 dark:bg-slate-950'
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
                      {member.role === itRole ? (
                        <span className='ml-3 flex-none text-indigo-600 group-hover:text-gray-200'>
                          <CheckIcon className='size-5' />
                        </span>
                      ) : null}
                    </div>
                    <p className='mt-1 text-sm whitespace-normal text-gray-500 group-hover:text-gray-200'>
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
                  <p className='font-bold text-red-600 dark:text-red-500'>
                    {t('project.settings.removeMember')}
                  </p>
                </li>
              </ul>
            ) : null}
          </div>
        ) : (
          <div className='flex items-center justify-end'>
            <Badge
              colour='yellow'
              className='mr-3'
              label={t('common.pending')}
            />
            <Button
              type='button'
              className='rounded-md bg-white text-base font-medium text-indigo-700 hover:bg-indigo-50 dark:border-gray-600 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
              small
              onClick={() => onRemove(member)}
            >
              <TrashIcon className='h-4 w-4' />
            </Button>
          </div>
        )}
      </td>
    </tr>
  ))
}

interface PeopleProps {
  organisation: DetailedOrganisation
}

const People = ({ organisation }: PeopleProps) => {
  const [showModal, setShowModal] = useState(false)
  const { t } = useTranslation('common')
  const fetcher = useFetcher<OrganisationSettingsActionData>()

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
  const [memberToRemove, setMemberToRemove] = useState<
    DetailedOrganisation['members'][number] | null
  >(null)

  const { name, members } = organisation

  const isSubmitting = fetcher.state === 'submitting'
  const isDeleting =
    isSubmitting && fetcher.formData?.get('intent') === 'remove-member'

  const closeModal = () => {
    setShowModal(false)
    setTimeout(() => setForm({ email: '', role: 'viewer' }), 300)
    setErrors({})
    setBeenSubmitted(false)
  }

  const closeRemoveUserModal = () => {
    setShowDeleteModal(false)
    setTimeout(() => setMemberToRemove(null), 300)
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (fetcher.data?.success) {
      const { intent } = fetcher.data
      if (intent === 'invite-member') {
        toast.success(t('apiNotifications.userInvited'))
        closeModal()
      } else if (intent === 'remove-member') {
        toast.success(t('apiNotifications.orgUserRemoved'))
        closeRemoveUserModal()
      } else if (intent === 'update-member-role') {
        toast.success(t('apiNotifications.roleUpdated'))
      }
    } else if (fetcher.data?.error) {
      toast.error(fetcher.data.error)
    }
  }, [fetcher.data, t])
  /* eslint-enable react-hooks/set-state-in-effect */

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

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (showModal) {
      validate()
    }
  }, [form]) // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleInput = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    const value = target.type === 'checkbox' ? target.checked : target.value

    setForm((oldForm) => ({
      ...oldForm,
      [target.name]: value,
    }))
  }

  const onInviteToOrganisation = () => {
    const formData = new FormData()
    formData.set('intent', 'invite-member')
    formData.set('email', form.email)
    formData.set('role', form.role)
    fetcher.submit(formData, { method: 'post' })
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

  const onRemove = (member: DetailedOrganisation['members'][number]) => {
    const formData = new FormData()
    formData.set('intent', 'remove-member')
    formData.set('memberId', member.id)
    fetcher.submit(formData, { method: 'post' })
  }

  return (
    <div className='mt-6 mb-6'>
      <div className='mb-3 flex items-center justify-between'>
        <div>
          <h3 className='mt-2 flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'>
            {t('project.settings.people')}
          </h3>
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            {t('project.settings.inviteCoworkers')}
          </p>
        </div>
        <Button
          className='h-8 pl-2'
          primary
          regular
          type='button'
          onClick={() => setShowModal(true)}
        >
          <>
            <UserCirclePlusIcon className='mr-1 h-5 w-5' />
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
              <div className='inline-block min-w-full py-2 align-middle md:px-6 lg:px-8'>
                <div className='ring-1 ring-black/10 md:rounded-lg'>
                  <table className='min-w-full divide-y divide-gray-300 dark:divide-gray-600'>
                    <thead>
                      <tr className='dark:bg-slate-800'>
                        <th
                          scope='col'
                          className='py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-6 dark:text-white'
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
                        fetcher={fetcher}
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
        title={t('project.settings.removeUser', {
          user: memberToRemove?.user.email,
        })}
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
              error={beenSubmitted ? errors.email : null}
            />
            <fieldset className='mt-4'>
              {}
              <label
                className='block text-sm font-medium text-gray-700 dark:text-gray-300'
                htmlFor='role'
              >
                {t('project.settings.role')}
              </label>
              <div
                className={cx(
                  'mt-1 -space-y-px rounded-md bg-white dark:bg-slate-950',
                  {
                    'border border-red-300': errors.role,
                  },
                )}
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
                        'text-indigo-900 dark:text-white':
                          form.role === 'admin',
                        'text-gray-700 dark:text-gray-200':
                          form.role !== 'admin',
                      })}
                    >
                      {t('organisations.role.admin.name')}
                    </span>
                    <span
                      className={cx('block text-sm', {
                        'text-indigo-700 dark:text-gray-100':
                          form.role === 'admin',
                        'text-gray-700 dark:text-gray-200':
                          form.role !== 'admin',
                      })}
                    >
                      {t('organisations.role.admin.desc')}
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
                        'text-indigo-900 dark:text-white':
                          form.role === 'viewer',
                        'text-gray-700 dark:text-gray-200':
                          form.role !== 'viewer',
                      })}
                    >
                      {t('organisations.role.viewer.name')}
                    </span>
                    <span
                      className={cx('block text-sm', {
                        'text-indigo-700 dark:text-gray-100':
                          form.role === 'viewer',
                        'text-gray-700 dark:text-gray-200':
                          form.role !== 'viewer',
                      })}
                    >
                      {t('organisations.role.viewer.desc')}
                    </span>
                  </div>
                </label>
              </div>
              {errors.role ? (
                <p
                  className='mt-2 text-sm text-red-600 dark:text-red-500'
                  id='email-error'
                >
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
