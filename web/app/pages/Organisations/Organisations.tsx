import { BuildingOffice2Icon } from '@heroicons/react/24/outline'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _size from 'lodash/size'
import { SearchIcon, XIcon } from 'lucide-react'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import { ClientOnly } from 'remix-utils/client-only'
import { toast } from 'sonner'

import { getOrganisations } from '~/api'
import EventsRunningOutBanner from '~/components/EventsRunningOutBanner'
import useDebounce from '~/hooks/useDebounce'
import { ENTRIES_PER_PAGE_DASHBOARD } from '~/lib/constants'
import { DetailedOrganisation } from '~/lib/models/Organisation'
import { useAuth } from '~/providers/AuthProvider'
import type { OrganisationsActionData } from '~/routes/organisations._index'
import Input from '~/ui/Input'
import Loader from '~/ui/Loader'
import Modal from '~/ui/Modal'
import Pagination from '~/ui/Pagination'
import StatusPage from '~/ui/StatusPage'
import { Text } from '~/ui/Text'
import routes from '~/utils/routes'

import { AddOrganisation } from './AddOrganisation'
import { NoOrganisations } from './NoOrganisations'
import { OrganisationCard } from './OrganisationCard'

const Organisations = () => {
  const { isLoading: authLoading } = useAuth()
  const fetcher = useFetcher<OrganisationsActionData>()

  const { t } = useTranslation('common')
  const [isSearchActive, setIsSearchActive] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [showActivateEmailModal, setShowActivateEmailModal] = useState(false)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce<string>(search, 500)
  const [organisations, setOrganisations] = useState<DetailedOrganisation[]>([])
  const [paginationTotal, setPaginationTotal] = useState(0)
  const [page, setPage] = useState(1)

  const [newOrganisationModalOpen, setNewOrganisationModalOpen] = useState(false)
  const [newOrganisationName, setNewOrganisationName] = useState('')

  const [isLoading, setIsLoading] = useState<boolean | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [newOrganisationError, setNewOrganisationError] = useState<string | null>(null)

  const isNewOrganisationLoading = fetcher.state === 'submitting'

  const pageAmount = Math.ceil(paginationTotal / ENTRIES_PER_PAGE_DASHBOARD)

  // Handle fetcher responses
  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.intent === 'create-organisation') {
      // Reload organisations
      loadOrganisations(ENTRIES_PER_PAGE_DASHBOARD, (page - 1) * ENTRIES_PER_PAGE_DASHBOARD, debouncedSearch)
      toast.success(t('apiNotifications.organisationCreated'))
      closeNewOrganisationModal()
    } else if (fetcher.data?.error && fetcher.data?.intent === 'create-organisation') {
      setNewOrganisationError(fetcher.data.error)
      toast.error(fetcher.data.error)
    } else if (fetcher.data?.fieldErrors?.name && fetcher.data?.intent === 'create-organisation') {
      setNewOrganisationError(fetcher.data.fieldErrors.name)
    }
  }, [fetcher.data, page, debouncedSearch, t]) // eslint-disable-line react-hooks/exhaustive-deps

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
      setPaginationTotal(result.total)
    } catch (reason: any) {
      setError(reason)
    } finally {
      setIsLoading(false)
    }
  }

  const reloadOrganisations = useCallback(async () => {
    try {
      const result = await getOrganisations(
        ENTRIES_PER_PAGE_DASHBOARD,
        (page - 1) * ENTRIES_PER_PAGE_DASHBOARD,
        debouncedSearch,
      )
      setOrganisations(result.results)
      setPaginationTotal(result.total)
    } catch (reason: any) {
      console.error(`[ERROR] Error while reloading organisations: ${reason}`)
    }
  }, [debouncedSearch, page])

  useEffect(() => {
    loadOrganisations(ENTRIES_PER_PAGE_DASHBOARD, (page - 1) * ENTRIES_PER_PAGE_DASHBOARD, debouncedSearch)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch])

  if (error && isLoading === false) {
    return (
      <StatusPage
        type='error'
        title={t('apiNotifications.somethingWentWrong')}
        description={t('apiNotifications.errorCode', { error })}
        actions={[
          { label: t('dashboard.reloadPage'), onClick: () => window.location.reload(), primary: true },
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
      <div className='min-h-min-footer bg-gray-50 dark:bg-slate-900'>
        <EventsRunningOutBanner />
        <div className='flex flex-col'>
          <div className='mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8'>
            <div className='mb-6 flex flex-wrap justify-between gap-2'>
              <div className='flex items-end justify-between'>
                <Text as='h2' size='3xl' weight='bold' className='mt-2 flex items-baseline gap-2'>
                  <span>{t('titles.organisations')}</span>
                  {isSearchActive ? (
                    <button
                      className='rounded-md border border-transparent bg-gray-50 p-2 transition-colors hover:border-gray-300 hover:bg-white dark:bg-slate-900 hover:dark:border-slate-700/80 dark:hover:bg-slate-800'
                      type='button'
                      onClick={() => {
                        setSearch('')
                        setIsSearchActive(false)
                      }}
                      aria-label={t('common.close')}
                    >
                      <XIcon
                        className='h-5 w-5 cursor-pointer rounded-md text-gray-900 dark:text-gray-50'
                        strokeWidth={1.5}
                      />
                    </button>
                  ) : (
                    <button
                      className='rounded-md border border-transparent bg-gray-50 p-2 transition-colors hover:border-gray-300 hover:bg-white dark:bg-slate-900 hover:dark:border-slate-700/80 dark:hover:bg-slate-800'
                      type='button'
                      onClick={() => {
                        setIsSearchActive(true)
                        setTimeout(() => {
                          searchInputRef.current?.focus()
                        }, 100)
                      }}
                      aria-label={t('project.search')}
                    >
                      <SearchIcon
                        className='h-5 w-5 cursor-pointer rounded-md text-gray-900 dark:text-gray-50'
                        strokeWidth={1.5}
                      />
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
                        <SearchIcon
                          className='ml-2 h-5 w-5 cursor-pointer text-gray-900 hover:opacity-80 dark:text-gray-50'
                          strokeWidth={1.5}
                        />
                      </div>
                      <input
                        ref={searchInputRef}
                        type='text'
                        id='organisation-search'
                        onChange={onSearch}
                        value={search}
                        className='block h-7 w-full rounded-lg border-none bg-gray-50 p-2.5 text-sm text-gray-900 ring-1 ring-gray-300 focus:ring-gray-500 sm:pl-10 dark:bg-slate-900 dark:text-white dark:placeholder-gray-400 dark:ring-slate-600 dark:focus:ring-slate-200'
                        placeholder={t('project.search')}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
              <button
                type='button'
                onClick={onNewOrganisation}
                className='inline-flex cursor-pointer items-center justify-center rounded-md border border-transparent bg-slate-900 p-2 text-center text-sm leading-4 font-medium text-white transition-colors hover:bg-slate-700 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:outline-hidden dark:border-gray-800 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
              >
                <BuildingOffice2Icon className='mr-1 h-5 w-5' />
                {t('organisations.new')}
              </button>
            </div>
            {isSearchActive ? (
              <div className='mb-2 flex w-full items-center sm:hidden'>
                <label htmlFor='organisation-search-mobile' className='sr-only'>
                  {t('project.search')}
                </label>
                <div className='relative w-full'>
                  <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center'>
                    <SearchIcon
                      className='ml-2 h-5 w-5 cursor-pointer text-gray-900 hover:opacity-80 dark:text-gray-50'
                      strokeWidth={1.5}
                    />
                  </div>
                  <input
                    id='organisation-search-mobile'
                    type='text'
                    onChange={onSearch}
                    value={search}
                    className='block h-7 w-full rounded-lg border-none bg-gray-50 p-2.5 py-5 pl-10 text-sm text-gray-900 ring-1 ring-gray-300 focus:ring-gray-500 dark:bg-slate-900 dark:text-white dark:placeholder-gray-400 dark:ring-slate-600 dark:focus:ring-slate-200'
                    placeholder={t('project.search')}
                  />
                </div>
              </div>
            ) : null}
            {authLoading || isLoading || isLoading === null ? (
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
                      <NoOrganisations onClick={onNewOrganisation} />
                    ) : (
                      <div className='grid grid-cols-1 gap-x-6 gap-y-3 lg:grid-cols-3 lg:gap-y-6'>
                        {_map(organisations, (organisation) => (
                          <OrganisationCard
                            key={organisation.id}
                            organisation={organisation}
                            reloadOrganisations={reloadOrganisations}
                          />
                        ))}
                        <AddOrganisation sitesCount={_size(organisations)} onClick={onNewOrganisation} />
                      </div>
                    )}
                  </div>
                )}
              </ClientOnly>
            )}
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
              <Text as='p' size='sm' weight='medium' colour='error' className='mt-2'>
                {t('apiNotifications.errorOccured', { error: newOrganisationError })}
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
