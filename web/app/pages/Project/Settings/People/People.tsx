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
import { useFetcher, useRevalidator } from 'react-router'
import { toast } from 'sonner'
import { roles, INVITATION_EXPIRES_IN, isSelfhosted } from '~/lib/constants'
import { Role } from '~/lib/models/Organisation'
import { Project, ShareOwnerProject } from '~/lib/models/Project'
import PaidFeature from '~/modals/PaidFeature'
import { useAuth } from '~/providers/AuthProvider'
import { ProjectSettingsActionData } from '~/routes/projects.settings.$id'
import { Badge } from '~/ui/Badge'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import Modal from '~/ui/Modal'
import { cn } from '~/utils/generic'
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

interface TableUserRowProps {
  data: ShareOwnerProject
  onRemove: () => void
  language: string
  authedUserEmail: string | undefined
  projectId: string
}

const TableUserRow = ({
  data,
  onRemove,
  language,
  authedUserEmail,
  projectId,
}: TableUserRowProps) => {
  const { t } = useTranslation('common')
  const fetcher = useFetcher<ProjectSettingsActionData>()
  const revalidator = useRevalidator()
  const { id, created, confirmed, role, user } = data || {}

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      if (fetcher.data.intent === 'change-share-role') {
        if (fetcher.data.success) {
          toast.success(t('apiNotifications.roleUpdated'))
          revalidator.revalidate()
        } else if (fetcher.data.error) {
          toast.error(fetcher.data.error)
        }
      }
    }
  }, [fetcher.state, fetcher.data, t, revalidator])

  const changeRole = (newRole: string) => {
    fetcher.submit(
      { intent: 'change-share-role', shareId: id, role: newRole },
      { method: 'POST', action: `/projects/settings/${projectId}` },
    )
  }

  return (
    <tr className='bg-white hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-900/50'>
      <td className='px-4 py-3 text-sm whitespace-nowrap text-gray-900 dark:text-gray-100'>
        {user?.email || 'N/A'}
      </td>
      <td className='px-4 py-3 text-sm whitespace-nowrap text-gray-900 dark:text-gray-100'>
        {language === 'en'
          ? dayjs(created).locale(language).format('MMMM D, YYYY')
          : dayjs(created).locale(language).format('D MMMM, YYYY')}
      </td>
      <td className='px-4 py-3 text-right text-sm whitespace-nowrap'>
        {confirmed ? (
          <Menu as='div' className='relative inline-block text-left'>
            {({ open }) => (
              <>
                <MenuButton
                  disabled={user?.email === authedUserEmail}
                  className='inline-flex items-center rounded-full border border-gray-200 bg-white py-0.5 pr-1 pl-2 text-sm leading-5 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-80 dark:border-slate-700/80 dark:bg-slate-900 dark:text-gray-50 dark:hover:bg-slate-800'
                >
                  {t(`project.settings.roles.${role}.name`)}
                  <CaretDownIcon
                    className={cn(
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
                          onClick={() => changeRole(itRole)}
                          className='flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-slate-800'
                        >
                          <div>
                            <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                              {t(`project.settings.roles.${itRole}.name`)}
                            </p>
                            <p className='mt-0.5 text-sm text-gray-500 dark:text-gray-400'>
                              {t(`project.settings.roles.${itRole}.shortDesc`)}
                            </p>
                          </div>
                          {role === itRole ? (
                            <CheckIcon className='ml-2 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-500' />
                          ) : null}
                        </button>
                      </MenuItem>
                    ))}
                    <div className='my-1 border-t border-gray-200 dark:border-slate-700' />
                    <MenuItem>
                      <button
                        type='button'
                        onClick={onRemove}
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
            <Button type='button' white small onClick={onRemove}>
              <TrashIcon className='h-4 w-4' />
            </Button>
          </div>
        )}
      </td>
    </tr>
  )
}

interface PeopleProps {
  project: Project
}

const People = ({ project }: PeopleProps) => {
  const { user: currentUser } = useAuth()
  const fetcher = useFetcher<ProjectSettingsActionData>()

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
  const [memberToRemove, setMemberToRemove] =
    useState<ShareOwnerProject | null>(null)

  const { id, name, share } = project

  const isSubmitting = fetcher.state !== 'idle'

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      if (fetcher.data.intent === 'share-project') {
        if (fetcher.data.success) {
          toast.success(t('apiNotifications.userInvited'))
          setTimeout(() => {
            setShowModal(false)
            setBeenSubmitted(false)
            setErrors({})
            setValidated(false)
          }, 0)
          setTimeout(() => setForm({ email: '', role: 'viewer' }), 300)
        } else if (fetcher.data.error) {
          toast.error(fetcher.data.error)
        }
      } else if (fetcher.data.intent === 'delete-share-user') {
        if (fetcher.data.success) {
          toast.success(t('apiNotifications.userRemoved'))
          setTimeout(() => {
            setShowDeleteModal(false)
            setMemberToRemove(null)
          }, 0)
        } else if (fetcher.data.error) {
          toast.error(fetcher.data.error)
        }
      }
    }
  }, [fetcher.state, fetcher.data, t])

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
      setTimeout(() => validate(), 0)
    }
  }, [form]) // eslint-disable-line

  const handleInput = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    const value = target.type === 'checkbox' ? target.checked : target.value

    setForm((oldForm) => ({
      ...oldForm,
      [target.name]: value,
    }))
  }

  const onSubmit = () => {
    fetcher.submit(
      { intent: 'share-project', email: form.email, role: form.role },
      { method: 'POST', action: `/projects/settings/${id}` },
    )
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
    setBeenSubmitted(false)
    // a timeout is needed to prevent the flicker of data fields in the modal when closing
    setTimeout(() => setForm({ email: '', role: 'viewer' }), 300)
    setErrors({})
  }

  const onRemove = (member: ShareOwnerProject) => {
    fetcher.submit(
      { intent: 'delete-share-user', shareId: member.id },
      { method: 'POST', action: `/projects/settings/${id}` },
    )
  }

  return (
    <div>
      <div className='mb-3 flex items-center justify-between'>
        <div>
          <h3 className='flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'>
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
        {_isEmpty(share) ? (
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
                    projectId={id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <PaidFeature
        isOpened={isPaidFeatureOpened}
        onClose={() => setIsPaidFeatureOpened(false)}
      />
      <Modal
        onClose={() => {
          setShowDeleteModal(false)
          setMemberToRemove(null)
        }}
        onSubmit={() => {
          if (!memberToRemove) return
          onRemove(memberToRemove)
        }}
        submitText={t('common.yes')}
        type='confirmed'
        closeText={t('common.no')}
        title={t('project.settings.removeUser', {
          user: memberToRemove?.user?.email,
        })}
        message={t('project.settings.removeConfirm')}
        isOpened={showDeleteModal}
        isLoading={
          isSubmitting
            ? fetcher.formData?.get('intent') === 'delete-share-user'
            : undefined
        }
      />
      <Modal
        onClose={closeModal}
        customButtons={
          <Button
            primary
            large
            onClick={handleSubmit}
            className='w-full justify-center sm:ml-3 sm:w-auto'
          >
            {t('common.invite')}
          </Button>
        }
        closeText={t('common.cancel')}
        message={
          <div>
            <h2 className='text-xl font-bold text-gray-700 dark:text-gray-200'>
              {t('project.settings.inviteTo', { project: name })}
            </h2>
            <p className='mt-2 text-base text-gray-700 dark:text-gray-200'>
              {t(
                isSelfhosted
                  ? 'project.settings.inviteDescSelfhosted'
                  : 'project.settings.inviteDesc',
              )}
            </p>
            <p className='mt-2 text-base text-gray-700 dark:text-gray-200'>
              {t('project.settings.inviteExpity', {
                amount: INVITATION_EXPIRES_IN,
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
                className={cn(
                  'mt-1 -space-y-px rounded-md bg-white dark:bg-slate-950',
                  {
                    'border border-red-300': errors.role,
                  },
                )}
              >
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label
                  className={cn(
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
                    className='h-4 w-4 border-gray-300 text-slate-900 focus:ring-slate-900 dark:text-slate-100 dark:focus:ring-slate-300'
                    id='role_admin'
                    type='radio'
                    value='admin'
                    onChange={handleInput}
                    checked={form.role === 'admin'}
                  />
                  <div className='ml-3 flex flex-col'>
                    <span
                      className={cn('block text-sm font-medium', {
                        'text-indigo-900 dark:text-white':
                          form.role === 'admin',
                        'text-gray-700 dark:text-gray-200':
                          form.role !== 'admin',
                      })}
                    >
                      {t('project.settings.roles.admin.name')}
                    </span>
                    <span
                      className={cn('block text-sm', {
                        'text-indigo-700 dark:text-gray-100':
                          form.role === 'admin',
                        'text-gray-700 dark:text-gray-200':
                          form.role !== 'admin',
                      })}
                    >
                      {t('project.settings.roles.admin.desc')}
                    </span>
                  </div>
                </label>
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label
                  className={cn(
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
                    className='h-4 w-4 border-gray-300 text-slate-900 focus:ring-slate-900 dark:text-slate-100 dark:focus:ring-slate-300'
                    id='role_viewer'
                    type='radio'
                    value='viewer'
                    onChange={handleInput}
                    checked={form.role === 'viewer'}
                  />
                  <div className='ml-3 flex flex-col'>
                    <span
                      className={cn('block text-sm font-medium', {
                        'text-indigo-900 dark:text-white':
                          form.role === 'viewer',
                        'text-gray-700 dark:text-gray-200':
                          form.role !== 'viewer',
                      })}
                    >
                      {t('project.settings.roles.viewer.name')}
                    </span>
                    <span
                      className={cn('block text-sm', {
                        'text-indigo-700 dark:text-gray-100':
                          form.role === 'viewer',
                        'text-gray-700 dark:text-gray-200':
                          form.role !== 'viewer',
                      })}
                    >
                      {t('project.settings.roles.viewer.desc')}
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
