import cx from 'clsx'
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from '@headlessui/react'
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
import React, { Fragment, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import { toast } from 'sonner'

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

  const changeRole = (memberId: string, newRole: Role) => {
    const formData = new FormData()
    formData.set('intent', 'update-member-role')
    formData.set('memberId', memberId)
    formData.set('role', newRole)
    fetcher.submit(formData, { method: 'post' })
  }

  return members.map((member) => (
    <tr
      key={member.id}
      className='bg-white hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-900/50'
    >
      <td className='px-4 py-3 text-sm whitespace-nowrap text-gray-900 dark:text-gray-100'>
        {member.user.email}
      </td>
      <td className='px-4 py-3 text-sm whitespace-nowrap text-gray-900 dark:text-gray-100'>
        {language === 'en'
          ? dayjs(member.created).locale(language).format('MMMM D, YYYY')
          : dayjs(member.created).locale(language).format('D MMMM, YYYY')}
      </td>
      <td className='px-4 py-3 text-right text-sm whitespace-nowrap'>
        {member.confirmed ? (
          <Menu as='div' className='relative inline-block text-left'>
            {({ open }) => (
              <>
                <MenuButton
                  disabled={
                    member.user.email === user?.email || member.role === 'owner'
                  }
                  className='inline-flex items-center rounded-full border border-gray-200 bg-white py-0.5 pr-1 pl-2 text-sm leading-5 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-80 dark:border-slate-700/80 dark:bg-slate-900 dark:text-gray-50 dark:hover:bg-slate-800'
                >
                  {t(`organisations.role.${member.role}.name`)}
                  <CaretDownIcon
                    className={cx(
                      'ml-0.5 h-4 w-4 transform-gpu transition-transform',
                      { 'rotate-180': open },
                    )}
                    aria-hidden='true'
                  />
                </MenuButton>
                <Transition
                  show={open}
                  as={Fragment}
                  enter='transition ease-out duration-100'
                  enterFrom='transform opacity-0 scale-95'
                  enterTo='transform opacity-100 scale-100'
                  leave='transition ease-in duration-75'
                  leaveFrom='transform opacity-100 scale-100'
                  leaveTo='transform opacity-0 scale-95'
                >
                  <MenuItems
                    static
                    anchor={{ to: 'bottom end', offset: 8 }}
                    modal={false}
                    className='z-50 w-72 rounded-lg bg-white p-1 shadow-lg ring-1 ring-black/5 focus:outline-hidden dark:bg-slate-900 dark:ring-white/10'
                  >
                    {_map(roles, (itRole) => (
                      <MenuItem key={itRole}>
                        <button
                          type='button'
                          onClick={() => changeRole(member.id, itRole)}
                          className='flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-slate-800'
                        >
                          <div>
                            <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                              {t(`organisations.role.${itRole}.name`)}
                            </p>
                            <p className='mt-0.5 text-sm text-gray-500 dark:text-gray-400'>
                              {t(`organisations.role.${itRole}.desc`)}
                            </p>
                          </div>
                          {member.role === itRole ? (
                            <CheckIcon className='ml-2 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-500' />
                          ) : null}
                        </button>
                      </MenuItem>
                    ))}
                    <div className='my-1 border-t border-gray-200 dark:border-slate-700' />
                    <MenuItem>
                      <button
                        type='button'
                        onClick={() => onRemove(member)}
                        className='flex w-full items-center rounded-md px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-500/10'
                      >
                        {t('project.settings.removeMember')}
                      </button>
                    </MenuItem>
                  </MenuItems>
                </Transition>
              </>
            )}
          </Menu>
        ) : (
          <div className='flex items-center justify-end'>
            <Badge
              colour='yellow'
              className='mr-3'
              label={t('common.pending')}
            />
            <Button type='button' white small onClick={() => onRemove(member)}>
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
          <div className='overflow-hidden rounded-lg border border-gray-200 dark:border-slate-800'>
            <table className='min-w-full divide-y divide-gray-200 dark:divide-slate-800'>
              <thead className='bg-gray-50 dark:bg-slate-900'>
                <tr>
                  <th
                    scope='col'
                    className='px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-900 uppercase dark:text-white'
                  >
                    {t('auth.common.email')}
                  </th>
                  <th
                    scope='col'
                    className='px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-900 uppercase dark:text-white'
                  >
                    {t('profileSettings.sharedTable.joinedOn')}
                  </th>
                  <th scope='col' />
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 bg-white dark:divide-slate-800 dark:bg-slate-950'>
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
