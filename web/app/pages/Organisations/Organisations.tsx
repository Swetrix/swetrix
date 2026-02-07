import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _size from 'lodash/size'
import {
  MagnifyingGlassIcon,
  XIcon,
  BuildingOfficeIcon,
} from '@phosphor-icons/react'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useFetcher,
  useLoaderData,
  useNavigate,
  useRevalidator,
} from 'react-router'
import { toast } from 'sonner'

import EventsRunningOutBanner from '~/components/EventsRunningOutBanner'
import useDebounce from '~/hooks/useDebounce'
import { ENTRIES_PER_PAGE_DASHBOARD } from '~/lib/constants'
import type {
  OrganisationsActionData,
  OrganisationsLoaderData,
} from '~/routes/organisations._index'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import Modal from '~/ui/Modal'
import Pagination from '~/ui/Pagination'
import StatusPage from '~/ui/StatusPage'
import { Text } from '~/ui/Text'
import routes from '~/utils/routes'

import { AddOrganisation } from './AddOrganisation'
import { NoOrganisations } from './NoOrganisations'
import { OrganisationCard } from './OrganisationCard'

const Organisations = () => {
  const loaderData = useLoaderData<OrganisationsLoaderData>()
  const fetcher = useFetcher<OrganisationsActionData>()
  const navigate = useNavigate()
  const { revalidate } = useRevalidator()

  const { t } = useTranslation('common')
  const [isSearchActive, setIsSearchActive] = useState(
    () => !!loaderData?.search,
  )
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [showActivateEmailModal, setShowActivateEmailModal] = useState(false)
  const [search, setSearch] = useState(loaderData?.search || '')
  const debouncedSearch = useDebounce<string>(search, 500)

  const [newOrganisationModalOpen, setNewOrganisationModalOpen] =
    useState(false)
  const [newOrganisationName, setNewOrganisationName] = useState('')
  const [newOrganisationError, setNewOrganisationError] = useState<
    string | null
  >(null)

  const isNewOrganisationLoading = fetcher.state === 'submitting'

  const organisations = loaderData?.organisations || []
  const paginationTotal = loaderData?.total || 0
  const page = loaderData?.page || 1
  const error = loaderData?.error

  const pageAmount = Math.ceil(paginationTotal / ENTRIES_PER_PAGE_DASHBOARD)

  const updateUrlParams = (newPage: number, newSearch: string) => {
    const params = new URLSearchParams()
    if (newPage > 1) params.set('page', String(newPage))
    if (newSearch) params.set('search', newSearch)
    navigate(
      `${routes.organisations}${params.toString() ? `?${params.toString()}` : ''}`,
      { replace: true },
    )
  }

  const closeNewOrganisationModal = useCallback(() => {
    if (isNewOrganisationLoading) {
      return
    }

    setNewOrganisationModalOpen(false)
    setNewOrganisationError(null)
    setNewOrganisationName('')
  }, [isNewOrganisationLoading])

  useEffect(() => {
    if (debouncedSearch !== loaderData?.search) {
      updateUrlParams(1, debouncedSearch)
    }
  }, [debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle fetcher responses
  useEffect(() => {
    if (!fetcher.data) return

    const { intent, success, error, fieldErrors } = fetcher.data

    switch (intent) {
      case 'create-organisation':
        if (success) {
          revalidate()
          toast.success(t('apiNotifications.organisationCreated'))
          // eslint-disable-next-line
          closeNewOrganisationModal()
        } else if (fieldErrors?.name) {
          setNewOrganisationError(fieldErrors.name)
          toast.error(fieldErrors.name)
        } else if (error) {
          setNewOrganisationError(error)
          toast.error(error)
        }
        break

      case 'accept-invitation':
        if (success) {
          revalidate()
          toast.success(t('apiNotifications.acceptOrganisationInvitation'))
        } else if (error) {
          toast.error(error)
        }
        break

      default:
        if (error) {
          toast.error(error)
        }
        break
    }
  }, [fetcher.data, t, revalidate, closeNewOrganisationModal])

  const onNewOrganisation = () => {
    setNewOrganisationModalOpen(true)
  }

  const onCreateOrganisation = () => {
    if (fetcher.state === 'submitting') {
      return
    }

    const formData = new FormData()
    formData.set('intent', 'create-organisation')
    formData.set('name', newOrganisationName)
    fetcher.submit(formData, { method: 'post' })
  }

  const setPage = (newPage: number) => {
    updateUrlParams(newPage, debouncedSearch)
  }

  if (error) {
    return (
      <StatusPage
        type='error'
        title={t('apiNotifications.somethingWentWrong')}
        description={t('apiNotifications.errorCode', { error })}
        actions={[
          {
            label: t('dashboard.reloadPage'),
            onClick: () => window.location.reload(),
            primary: true,
          },
          { label: t('notFoundPage.support'), to: routes.contact },
        ]}
      />
    )
  }

  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }

  return (
    <>
      <div className='min-h-min-footer bg-gray-50 dark:bg-slate-950'>
        <EventsRunningOutBanner />
        <div className='flex flex-col'>
          <div className='mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8'>
            <div className='mb-6 flex flex-wrap justify-between gap-2'>
              <div className='flex items-end justify-between'>
                <Text
                  as='h2'
                  size='3xl'
                  weight='bold'
                  className='mt-2 flex items-baseline gap-2'
                >
                  <span>{t('titles.organisations')}</span>
                  {isSearchActive ? (
                    <button
                      className='rounded-md border border-transparent bg-gray-50 p-2 transition-colors hover:border-gray-300 hover:bg-white dark:bg-slate-950 hover:dark:border-slate-700/80 dark:hover:bg-slate-900'
                      type='button'
                      onClick={() => {
                        setSearch('')
                        setIsSearchActive(false)
                      }}
                      aria-label={t('common.close')}
                    >
                      <XIcon className='h-5 w-5 cursor-pointer rounded-md text-gray-900 dark:text-gray-50' />
                    </button>
                  ) : (
                    <button
                      className='rounded-md border border-transparent bg-gray-50 p-2 transition-colors hover:border-gray-300 hover:bg-white dark:bg-slate-950 hover:dark:border-slate-700/80 dark:hover:bg-slate-900'
                      type='button'
                      onClick={() => {
                        setIsSearchActive(true)
                        setTimeout(() => {
                          searchInputRef.current?.focus()
                        }, 100)
                      }}
                      aria-label={t('project.search')}
                    >
                      <MagnifyingGlassIcon className='h-5 w-5 cursor-pointer rounded-md text-gray-900 dark:text-gray-50' />
                    </button>
                  )}
                </Text>
                {isSearchActive ? (
                  <div className='hidden w-full max-w-md items-center px-2 pb-1 sm:ml-2 sm:flex'>
                    <label htmlFor='organisation-search' className='sr-only'>
                      {t('project.search')}
                    </label>
                    <div className='relative w-full'>
                      <div className='pointer-events-none absolute inset-y-0 left-0 hidden items-center sm:flex'>
                        <MagnifyingGlassIcon className='ml-2 h-5 w-5 cursor-pointer text-gray-900 hover:opacity-80 dark:text-gray-50' />
                      </div>
                      <input
                        ref={searchInputRef}
                        type='text'
                        id='organisation-search'
                        onChange={onSearch}
                        value={search}
                        className='block h-7 w-full rounded-lg border-none bg-gray-50 p-2.5 text-sm text-gray-900 ring-1 ring-gray-300 focus:ring-gray-500 sm:pl-10 dark:bg-slate-950 dark:text-white dark:placeholder-gray-400 dark:ring-slate-600 dark:focus:ring-slate-200'
                        placeholder={t('project.search')}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
              <Button onClick={onNewOrganisation} primary large>
                <BuildingOfficeIcon className='mr-1 h-5 w-5' />
                {t('organisations.new')}
              </Button>
            </div>
            {isSearchActive ? (
              <div className='mb-2 flex w-full items-center sm:hidden'>
                <label htmlFor='organisation-search-mobile' className='sr-only'>
                  {t('project.search')}
                </label>
                <div className='relative w-full'>
                  <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center'>
                    <MagnifyingGlassIcon className='ml-2 h-5 w-5 cursor-pointer text-gray-900 hover:opacity-80 dark:text-gray-50' />
                  </div>
                  <input
                    id='organisation-search-mobile'
                    type='text'
                    onChange={onSearch}
                    value={search}
                    className='block h-7 w-full rounded-lg border-none bg-gray-50 p-2.5 py-5 pl-10 text-sm text-gray-900 ring-1 ring-gray-300 focus:ring-gray-500 dark:bg-slate-950 dark:text-white dark:placeholder-gray-400 dark:ring-slate-600 dark:focus:ring-slate-200'
                    placeholder={t('project.search')}
                  />
                </div>
              </div>
            ) : null}
            <div>
              {_isEmpty(organisations) ? (
                <NoOrganisations onClick={onNewOrganisation} />
              ) : (
                <div className='grid grid-cols-1 gap-3 lg:grid-cols-3'>
                  {_map(organisations, (organisation) => (
                    <OrganisationCard
                      key={organisation.id}
                      organisation={organisation}
                    />
                  ))}
                  <AddOrganisation
                    sitesCount={_size(organisations)}
                    onClick={onNewOrganisation}
                  />
                </div>
              )}
            </div>
            {pageAmount > 1 ? (
              <Pagination
                className='mt-2'
                page={page}
                pageAmount={pageAmount}
                setPage={setPage}
                total={paginationTotal}
              />
            ) : null}
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
            {newOrganisationError ? (
              <Text
                as='p'
                size='sm'
                weight='medium'
                colour='error'
                className='mt-2'
              >
                {t('apiNotifications.errorOccured', {
                  error: newOrganisationError,
                })}
              </Text>
            ) : null}
          </div>
        }
        title={t('organisations.create')}
        isOpened={newOrganisationModalOpen}
        submitDisabled={!newOrganisationName}
      />
    </>
  )
}

export default Organisations
