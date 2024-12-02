import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from '@remix-run/react'
import { toast } from 'sonner'
import type i18next from 'i18next'
import { ClientOnly } from 'remix-utils/client-only'
import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import _isNumber from 'lodash/isNumber'
import _replace from 'lodash/replace'
import _map from 'lodash/map'
import _find from 'lodash/find'
import { useTranslation } from 'react-i18next'
import {
  FolderPlusIcon,
  AdjustmentsVerticalIcon,
  ArrowTopRightOnSquareIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { XCircleIcon } from '@heroicons/react/24/solid'

import Modal from 'ui/Modal'
import { withAuthentication, auth } from 'hoc/protected'
import Loader from 'ui/Loader'
import { Badge } from 'ui/Badge'
import routes from 'utils/routes'
import { isSelfhosted, ENTRIES_PER_PAGE_DASHBOARD, roleViewer } from 'redux/constants'
import EventsRunningOutBanner from 'components/EventsRunningOutBanner'
import DashboardLockedBanner from 'components/DashboardLockedBanner'
import useDebounce from 'hooks/useDebounce'

import { acceptShareProject, createOrganisation, getOrganisations } from 'api'

import Pagination from 'ui/Pagination'
import { ISharedProject } from 'redux/models/ISharedProject'
import { Organisation } from 'redux/models/Organisation'
import Input from 'ui/Input'

interface OrganisationCardProps {
  name?: string
  active?: boolean
  type: 'analytics' | 'captcha'
  t: typeof i18next.t
  isPublic?: boolean
  confirmed?: boolean
  id: string
  sharedProjects: ISharedProject[]
  setProjectsShareData: (data: Partial<ISharedProject>, id: string, shared?: boolean) => void
  setUserShareData: (data: Partial<ISharedProject>, id: string) => void
  shared?: boolean
  captcha?: boolean
  isTransferring?: boolean
  getRole?: (id: string) => string | null
  members?: number
}

const OrganisationCard = ({
  name,
  active,
  isPublic,
  confirmed,
  id,
  sharedProjects,
  setProjectsShareData,
  setUserShareData,
  shared,
  isTransferring,
  type,
  getRole,
  members,
}: OrganisationCardProps) => {
  const { t } = useTranslation('common')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const role = useMemo(() => getRole && getRole(id), [getRole, id])
  const navigate = useNavigate()

  const onAccept = async () => {
    // @ts-ignore
    const pid: string = _find(sharedProjects, (item: ISharedProject) => item.project && item.project.id === id)?.id

    try {
      if (!pid || !id) {
        throw new Error('Project not found')
      }
      await acceptShareProject(pid)
      setProjectsShareData({ confirmed: true }, id, true)
      setUserShareData({ confirmed: true }, pid)
      toast.success(t('apiNotifications.acceptInvitation'))
    } catch (reason: any) {
      toast.error(t('apiNotifications.acceptInvitationError'))
    }
  }

  const onElementClick = (e: React.MouseEvent<HTMLLIElement>) => {
    if (confirmed) {
      return
    }

    e.stopPropagation()
    e.preventDefault()
    setShowInviteModal(true)
  }

  return (
    <div
      onClick={() => {
        navigate(_replace(type === 'analytics' ? routes.project : routes.captcha, ':id', id))
      }}
    >
      <li
        onClick={onElementClick}
        className='cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-slate-800/25 dark:bg-slate-800 dark:hover:bg-slate-700'
      >
        <div className='px-4 py-4'>
          <div className='flex items-center justify-between'>
            <p className='truncate text-lg font-semibold text-slate-900 dark:text-gray-50'>{name}</p>

            <div className='flex items-center gap-2' onClick={(e) => e.stopPropagation()}>
              {role !== roleViewer.role && (
                <Link
                  to={_replace(type === 'analytics' ? routes.project_settings : routes.captcha_settings, ':id', id)}
                  aria-label={`${t('project.settings.settings')} ${name}`}
                >
                  <AdjustmentsVerticalIcon className='h-6 w-6 text-gray-800 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-500' />
                </Link>
              )}
              <a
                href={_replace(type === 'analytics' ? routes.project : routes.captcha, ':id', id)}
                aria-label='name (opens in a new tab)'
                target='_blank'
                rel='noopener noreferrer'
              >
                <ArrowTopRightOnSquareIcon className='h-6 w-6 text-gray-800 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-500' />
              </a>
            </div>
          </div>
          <div className='mt-1 flex flex-shrink-0 flex-wrap gap-2'>
            {active ? (
              <Badge colour='green' label={t('dashboard.active')} />
            ) : (
              <Badge colour='red' label={t('dashboard.disabled')} />
            )}
            {shared &&
              (confirmed ? (
                <Badge colour='green' label={t('dashboard.shared')} />
              ) : (
                <Badge colour='yellow' label={t('common.pending')} />
              ))}
            {isTransferring && <Badge colour='indigo' label={t('common.transferring')} />}
            {isPublic && <Badge colour='green' label={t('dashboard.public')} />}
            {!isSelfhosted && _isNumber(members) && (
              <Badge
                colour='slate'
                label={
                  members === 1
                    ? t('common.oneMember')
                    : t('common.xMembers', {
                        number: members,
                      })
                }
              />
            )}
          </div>
        </div>
        {!confirmed && (
          <Modal
            onClose={() => {
              setShowInviteModal(false)
            }}
            onSubmit={() => {
              setShowInviteModal(false)
              onAccept()
            }}
            submitText={t('common.accept')}
            type='confirmed'
            closeText={t('common.cancel')}
            title={t('dashboard.invitationFor', { project: name })}
            message={t('dashboard.invitationDesc', { project: name })}
            isOpened={showInviteModal}
          />
        )}
      </li>
    </div>
  )
}

interface INoOrganisations {
  t: typeof i18next.t
  onClick: () => void
}

interface IAddOrganisation {
  t: typeof i18next.t
  onClick: () => void
  sitesCount: number
}

const NoOrganisations = ({ t, onClick }: INoOrganisations): JSX.Element => (
  <button
    type='button'
    onClick={onClick}
    className='relative mx-auto block max-w-lg rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
  >
    <FolderPlusIcon className='mx-auto h-12 w-12 text-gray-400 dark:text-gray-200' />
    <span className='mt-2 block text-sm font-semibold text-gray-900 dark:text-gray-50'>
      {t('dashboard.createProject')}
    </span>
  </button>
)

const AddOrganisation = ({ t, onClick, sitesCount }: IAddOrganisation): JSX.Element => (
  <li
    onClick={onClick}
    className={cx(
      'group flex h-auto min-h-[153.1px] cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400',
      {
        'lg:min-h-[auto]': sitesCount % 3 !== 0,
      },
    )}
  >
    <div>
      <FolderPlusIcon className='mx-auto h-12 w-12 text-gray-400 group-hover:text-gray-500 dark:text-gray-200 group-hover:dark:text-gray-400' />
      <span className='mt-2 block text-sm font-semibold text-gray-900 dark:text-gray-50 group-hover:dark:text-gray-400'>
        {t('dashboard.newProject')}
      </span>
    </div>
  </li>
)

// @ts-expect-error
const Organisations = ({ total }): JSX.Element => {
  const { t } = useTranslation('common')
  const [isSearchActive, setIsSearchActive] = useState(false)
  const [showActivateEmailModal, setShowActivateEmailModal] = useState(false)
  const pageAmount = Math.ceil(total / ENTRIES_PER_PAGE_DASHBOARD)
  const [search, setSearch] = useState<string>('')
  const debouncedSearch = useDebounce<string>(search, 500)
  const [organisations, setOrganisations] = useState<Organisation[]>([])
  const [page, setPage] = useState(1)

  const [newOrganisationModalOpen, setNewOrganisationModalOpen] = useState(false)
  const [newOrganisationName, setNewOrganisationName] = useState('')

  const [isLoading, setIsLoading] = useState<boolean | null>(null)
  const [isNewOrganisationLoading, setIsNewOrganisationLoading] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [newOrganisationError, setNewOrganisationError] = useState<string | null>(null)

  const onNewOrganisation = () => {
    setNewOrganisationModalOpen(true)
  }

  const onCreateOrganisation = async () => {
    if (isNewOrganisationLoading) {
      return
    }

    setIsNewOrganisationLoading(true)

    try {
      await createOrganisation(newOrganisationName)

      const result = await getOrganisations(
        ENTRIES_PER_PAGE_DASHBOARD,
        (page - 1) * ENTRIES_PER_PAGE_DASHBOARD,
        debouncedSearch,
      )
      setOrganisations(result.results)

      toast.success(t('organisations.organisationCreated'))

      closeNewOrganisationModal()
    } catch (reason: any) {
      setNewOrganisationError(reason)
      toast.error(t('organisations.organisationCreateError'))
    } finally {
      setIsNewOrganisationLoading(false)
    }
  }

  const closeNewOrganisationModal = () => {
    if (isNewOrganisationLoading) {
      return
    }

    setNewOrganisationModalOpen(false)
    setNewOrganisationError(null)
    setNewOrganisationName('')
  }

  const loadOrganisations = async (take: number, skip: number, search?: string) => {
    if (isLoading) {
      return
    }
    setIsLoading(true)

    try {
      const result = await getOrganisations(take, skip, search)
      setOrganisations(result.results)
    } catch (reason: any) {
      setError(reason)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadOrganisations(ENTRIES_PER_PAGE_DASHBOARD, (page - 1) * ENTRIES_PER_PAGE_DASHBOARD, debouncedSearch)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch])

  if (error && isLoading === false) {
    return (
      <div className='min-h-page bg-gray-50 px-4 py-16 dark:bg-slate-900 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8'>
        <div className='mx-auto max-w-max'>
          <main className='sm:flex'>
            <XCircleIcon className='h-12 w-12 text-red-400' aria-hidden='true' />
            <div className='sm:ml-6'>
              <div className='max-w-prose sm:border-l sm:border-gray-200 sm:pl-6'>
                <h1 className='text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50 sm:text-5xl'>
                  {t('apiNotifications.somethingWentWrong')}
                </h1>
                <p className='mt-4 text-2xl font-medium tracking-tight text-gray-700 dark:text-gray-200'>
                  {t('apiNotifications.errorCode', { error })}
                </p>
              </div>
              <div className='mt-8 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6'>
                <button
                  type='button'
                  onClick={() => window.location.reload()}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
                >
                  {t('dashboard.reloadPage')}
                </button>
                <Link
                  to={routes.contact}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700 dark:focus:ring-gray-50'
                >
                  {t('notFoundPage.support')}
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }

  console.log('orgs:', organisations)

  return (
    <>
      <div className='min-h-min-footer bg-gray-50 dark:bg-slate-900'>
        <EventsRunningOutBanner />
        <DashboardLockedBanner />
        <div className='flex flex-col px-4 py-6 sm:px-6 lg:px-8'>
          <div className='mx-auto w-full max-w-7xl'>
            <div className='mb-6 flex justify-between'>
              <div className='flex items-end justify-between'>
                <h2 className='mt-2 flex items-baseline text-3xl font-bold text-gray-900 dark:text-gray-50'>
                  {t('titles.organisations')}
                  {isSearchActive ? (
                    <XMarkIcon
                      className='ml-2 h-5 w-5 cursor-pointer text-gray-900 hover:opacity-80 dark:text-gray-50'
                      onClick={() => {
                        setSearch('')
                        setIsSearchActive(false)
                      }}
                    />
                  ) : (
                    <MagnifyingGlassIcon
                      className='ml-2 h-5 w-5 cursor-pointer text-gray-900 hover:opacity-80 dark:text-gray-50'
                      onClick={() => {
                        setIsSearchActive(true)
                      }}
                    />
                  )}
                </h2>
                {isSearchActive && (
                  <div className='hidden w-full max-w-md items-center px-2 pb-1 sm:ml-5 sm:flex'>
                    <label htmlFor='simple-search' className='sr-only'>
                      Search
                    </label>
                    <div className='relative w-full'>
                      <div className='pointer-events-none absolute inset-y-0 left-0 hidden items-center sm:flex'>
                        <MagnifyingGlassIcon className='ml-2 h-5 w-5 cursor-pointer text-gray-900 hover:opacity-80 dark:text-gray-50' />
                      </div>
                      <input
                        type='text'
                        onChange={onSearch}
                        value={search}
                        className='block h-7 w-full rounded-lg border-none bg-gray-50 p-2.5 text-sm text-gray-900 ring-1 ring-gray-300 focus:ring-gray-500 dark:bg-slate-900 dark:text-white dark:placeholder-gray-400 dark:ring-slate-600 dark:focus:ring-slate-200 sm:pl-10'
                        placeholder={t('project.search')}
                      />
                    </div>
                  </div>
                )}
              </div>
              <span
                onClick={onNewOrganisation}
                className='inline-flex cursor-pointer items-center justify-center rounded-md border border-transparent bg-slate-900 px-3 py-2 !pl-2 text-center text-sm font-medium leading-4 text-white shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:border-gray-800 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
              >
                <FolderPlusIcon className='mr-1 h-5 w-5' />
                {t('dashboard.newProject')}
              </span>
            </div>
            {isSearchActive && (
              <div className='mb-2 flex w-full items-center sm:hidden'>
                <label htmlFor='simple-search' className='sr-only'>
                  Search
                </label>
                <div className='relative w-full'>
                  <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center'>
                    <MagnifyingGlassIcon className='ml-2 h-5 w-5 cursor-pointer text-gray-900 hover:opacity-80 dark:text-gray-50' />
                  </div>
                  <input
                    type='text'
                    onChange={onSearch}
                    value={search}
                    className='block h-7 w-full rounded-lg border-none bg-gray-50 p-2.5 py-5 pl-10 text-sm text-gray-900 ring-1 ring-gray-300 focus:ring-gray-500 dark:bg-slate-900 dark:text-white dark:placeholder-gray-400 dark:ring-slate-600 dark:focus:ring-slate-200'
                    placeholder={t('project.search')}
                  />
                </div>
              </div>
            )}
            {isLoading || isLoading === null ? (
              <div className='min-h-min-footer bg-gray-50 dark:bg-slate-900'>
                <Loader />
              </div>
            ) : (
              <ClientOnly
                fallback={
                  <div className='min-h-min-footer bg-gray-50 dark:bg-slate-900'>
                    <Loader />
                  </div>
                }
              >
                {() => (
                  <div>
                    {_isEmpty(organisations) ? (
                      <NoOrganisations t={t} onClick={onNewOrganisation} />
                    ) : (
                      <ul className='grid grid-cols-1 gap-x-6 gap-y-3 lg:grid-cols-3 lg:gap-y-6'>
                        {_map(
                          organisations,
                          // @ts-expect-error
                          ({ name, id, active, public: isPublic, isTransferring, share }) => (
                            <OrganisationCard
                              key={id}
                              members={1 + _size(share)}
                              id={id}
                              type='analytics'
                              t={t}
                              name={name}
                              active={active}
                              isPublic={isPublic}
                              setUserShareData={() => {}}
                              sharedProjects={[]}
                              setProjectsShareData={() => {}}
                              isTransferring={isTransferring}
                              confirmed
                            />
                          ),
                        )}
                        <AddOrganisation sitesCount={_size(organisations)} t={t} onClick={onNewOrganisation} />
                      </ul>
                    )}
                  </div>
                )}
              </ClientOnly>
            )}
            {pageAmount > 1 && (
              <Pagination className='mt-2' page={page} pageAmount={pageAmount} setPage={setPage} total={total} />
            )}
          </div>
        </div>
      </div>
      <Modal
        onClose={() => setShowActivateEmailModal(false)}
        onSubmit={() => setShowActivateEmailModal(false)}
        submitText={t('common.gotIt')}
        title={t('dashboard.verifyEmailTitle')}
        type='info'
        message={t('dashboard.verifyEmailDesc')}
        isOpened={showActivateEmailModal}
      />
      <Modal
        isLoading={isNewOrganisationLoading}
        onClose={closeNewOrganisationModal}
        onSubmit={onCreateOrganisation}
        submitText={t('common.continue')}
        message={
          <div>
            <Input
              name='organisation-name-input'
              label={t('common.name')}
              value={newOrganisationName}
              onChange={(e) => setNewOrganisationName(e.target.value)}
            />
            {newOrganisationError && (
              <p className='mt-2 text-sm font-medium text-red-500'>
                {t('apiNotifications.errorOccured', { error: newOrganisationError })}
              </p>
            )}
          </div>
        }
        title={t('organisations.create')}
        isOpened={newOrganisationModalOpen}
        submitDisabled={!newOrganisationName}
      />
    </>
  )
}

export default withAuthentication(Organisations, auth.authenticated)
