import { useState, useEffect, useCallback, useRef } from 'react'
import {
  UploadIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  SpinnerIcon,
  FileTextIcon,
} from '@phosphor-icons/react'
import cx from 'clsx'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { Trans, useTranslation } from 'react-i18next'
import { useFetcher, useSearchParams } from 'react-router'

import {
  type DataImport,
  type Provider,
  IMPORT_PROVIDERS,
} from '~/lib/models/Project'
import type { ProjectSettingsActionData } from '~/routes/projects.settings.$id'
import Modal from '~/ui/Modal'
import Loader from '~/ui/Loader'
import FileUpload from '~/ui/FileUpload'
import Button from '~/ui/Button'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'
import UmamiSVG from '~/ui/icons/Umami'
import SimpleAnalyticsSVG from '~/ui/icons/SimpleAnalytics'
import FathomSVG from '~/ui/icons/Fathom'
import GoogleAnalyticsSVG from '~/ui/icons/GoogleAnalytics'

const PROVIDER_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  umami: UmamiSVG,
  'simple-analytics': SimpleAnalyticsSVG,
  fathom: FathomSVG,
  'google-analytics': GoogleAnalyticsSVG,
}

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  umami: 'Umami',
  'simple-analytics': 'Simple Analytics',
  fathom: 'Fathom Analytics',
  'google-analytics': 'Google Analytics 4',
}

const FILE_BASED_PROVIDERS = new Set(['umami', 'simple-analytics', 'fathom'])

const PROVIDER_FILE_TYPES: Record<string, string> = {
  umami: '.zip',
  'simple-analytics': '.csv',
  fathom: '.csv',
}

const STATUS_ICONS = {
  pending: ClockIcon,
  processing: SpinnerIcon,
  completed: CheckCircleIcon,
  failed: XCircleIcon,
} as const

const STATUS_CLASSES = {
  pending:
    'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20',
  processing:
    'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20',
  completed:
    'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20',
  failed:
    'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20',
} as const

function StatusBadge({
  status,
  label,
}: {
  status: DataImport['status']
  label: string
}) {
  const Icon = STATUS_ICONS[status]

  return (
    <Text
      as='span'
      size='xs'
      weight='medium'
      colour='inherit'
      className={cx(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 ring-1 ring-inset',
        STATUS_CLASSES[status],
      )}
    >
      <Icon
        className={cx('size-3', {
          'animate-spin': status === 'processing',
        })}
      />
      {label}
    </Text>
  )
}

interface Ga4Property {
  propertyId: string
  displayName: string
}

interface DataImportTabProps {
  projectId: string
}

export default function DataImportTab({ projectId }: DataImportTabProps) {
  const { t } = useTranslation('common')
  const [searchParams, setSearchParams] = useSearchParams()
  const [imports, setImports] = useState<DataImport[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
    null,
  )
  const [deleteTarget, setDeleteTarget] = useState<DataImport | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // GA4-specific state
  const [ga4Connected, setGa4Connected] = useState(false)
  const [ga4Properties, setGa4Properties] = useState<Ga4Property[]>([])
  const [ga4SelectedProperty, setGa4SelectedProperty] = useState('')
  const [ga4LoadingProperties, setGa4LoadingProperties] = useState(false)

  const listFetcher = useFetcher<ProjectSettingsActionData>()
  const uploadFetcher = useFetcher<ProjectSettingsActionData>()
  const deleteFetcher = useFetcher<ProjectSettingsActionData>()
  const ga4ConnectFetcher = useFetcher<ProjectSettingsActionData>()
  const ga4PropertiesFetcher = useFetcher<ProjectSettingsActionData>()
  const ga4StartFetcher = useFetcher<ProjectSettingsActionData>()

  const settingsAction = `/projects/settings/${projectId}`

  const statusLabels: Record<DataImport['status'], string> = {
    pending: t('project.settings.dataImport.statusPending'),
    processing: t('project.settings.dataImport.statusProcessing'),
    completed: t('project.settings.dataImport.statusCompleted'),
    failed: t('project.settings.dataImport.statusFailed'),
  }

  const fetchImports = useCallback(() => {
    listFetcher.submit(
      { intent: 'list-data-imports' },
      { method: 'POST', action: settingsAction },
    )
  }, [listFetcher, settingsAction])

  // Check for GA4 OAuth redirect
  useEffect(() => {
    if (searchParams.get('ga4') === 'connected') {
      setGa4Connected(true)
      setSelectedProvider('google-analytics')
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('ga4')
          return next
        },
        { replace: true },
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchImports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (listFetcher.state !== 'idle' || !listFetcher.data) return
    if (listFetcher.data.intent !== 'list-data-imports') return

    if (listFetcher.data.error) {
      toast.error(
        listFetcher.data.error || t('project.settings.dataImport.loadFailed'),
      )
    } else if (listFetcher.data.dataImports) {
      setImports(listFetcher.data.dataImports)
    }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listFetcher.state, listFetcher.data])

  useEffect(() => {
    const hasActive = imports.some(
      (i) => i.status === 'pending' || i.status === 'processing',
    )

    if (hasActive) {
      pollRef.current = setInterval(fetchImports, 3000)
    } else if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
      }
    }
  }, [imports, fetchImports])

  useEffect(() => {
    if (uploadFetcher.state !== 'idle' || !uploadFetcher.data) return
    if (uploadFetcher.data.intent !== 'upload-data-import') return

    if (uploadFetcher.data.success) {
      toast.success(t('project.settings.dataImport.importStarted'))
      setSelectedProvider(null)
      fetchImports()
    } else if (uploadFetcher.data.error) {
      toast.error(
        uploadFetcher.data.error ||
          t('project.settings.dataImport.uploadFailed'),
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadFetcher.state, uploadFetcher.data])

  useEffect(() => {
    if (deleteFetcher.state !== 'idle' || !deleteFetcher.data) return
    if (deleteFetcher.data.intent !== 'delete-data-import') return

    if (deleteFetcher.data.success) {
      toast.success(t('project.settings.dataImport.importDeleted'))
      setDeleteTarget(null)
      fetchImports()
    } else if (deleteFetcher.data.error) {
      toast.error(
        deleteFetcher.data.error ||
          t('project.settings.dataImport.deleteFailed'),
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteFetcher.state, deleteFetcher.data])

  // GA4 connect response: redirect to Google OAuth
  useEffect(() => {
    if (ga4ConnectFetcher.state !== 'idle' || !ga4ConnectFetcher.data) return
    if (ga4ConnectFetcher.data.intent !== 'ga4-connect') return

    if (ga4ConnectFetcher.data.ga4AuthUrl) {
      window.location.href = ga4ConnectFetcher.data.ga4AuthUrl
    } else if (ga4ConnectFetcher.data.error) {
      toast.error(ga4ConnectFetcher.data.error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ga4ConnectFetcher.state, ga4ConnectFetcher.data])

  // GA4 properties response
  useEffect(() => {
    if (ga4PropertiesFetcher.state !== 'idle' || !ga4PropertiesFetcher.data)
      return
    if (ga4PropertiesFetcher.data.intent !== 'ga4-properties') return

    setGa4LoadingProperties(false)

    if (ga4PropertiesFetcher.data.ga4Properties) {
      setGa4Properties(ga4PropertiesFetcher.data.ga4Properties)
      if (ga4PropertiesFetcher.data.ga4Properties.length > 0) {
        setGa4SelectedProperty(
          ga4PropertiesFetcher.data.ga4Properties[0].propertyId,
        )
      }
    } else if (ga4PropertiesFetcher.data.error) {
      toast.error(ga4PropertiesFetcher.data.error)
      setGa4Connected(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ga4PropertiesFetcher.state, ga4PropertiesFetcher.data])

  // GA4 start import response
  useEffect(() => {
    if (ga4StartFetcher.state !== 'idle' || !ga4StartFetcher.data) return
    if (ga4StartFetcher.data.intent !== 'ga4-start-import') return

    if (ga4StartFetcher.data.success) {
      toast.success(t('project.settings.dataImport.importStarted'))
      setSelectedProvider(null)
      resetGa4State()
      fetchImports()
    } else if (ga4StartFetcher.data.error) {
      toast.error(ga4StartFetcher.data.error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ga4StartFetcher.state, ga4StartFetcher.data])

  // Fetch GA4 properties when connected
  useEffect(() => {
    if (ga4Connected && selectedProvider === 'google-analytics') {
      setGa4LoadingProperties(true)
      ga4PropertiesFetcher.submit(
        { intent: 'ga4-properties' },
        { method: 'POST', action: settingsAction },
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ga4Connected, selectedProvider])

  const handleUpload = (file: File) => {
    if (!selectedProvider) return

    const formData = new FormData()
    formData.append('intent', 'upload-data-import')
    formData.append('file', file)
    formData.append('provider', selectedProvider)

    uploadFetcher.submit(formData, {
      method: 'POST',
      action: settingsAction,
      encType: 'multipart/form-data',
    })
  }

  const handleDelete = () => {
    if (!deleteTarget) return

    deleteFetcher.submit(
      { intent: 'delete-data-import', importId: String(deleteTarget.importId) },
      { method: 'POST', action: settingsAction },
    )
  }

  const handleGa4Connect = () => {
    ga4ConnectFetcher.submit(
      { intent: 'ga4-connect' },
      { method: 'POST', action: settingsAction },
    )
  }

  const handleGa4StartImport = () => {
    if (!ga4SelectedProperty) return

    ga4StartFetcher.submit(
      {
        intent: 'ga4-start-import',
        propertyId: ga4SelectedProperty,
      },
      { method: 'POST', action: settingsAction },
    )
  }

  const resetGa4State = () => {
    setGa4Connected(false)
    setGa4Properties([])
    setGa4SelectedProperty('')
  }

  const handleProviderClick = (provider: Provider) => {
    if (provider === 'google-analytics') {
      setSelectedProvider(provider)
    } else {
      setSelectedProvider(provider)
    }
  }

  const handleCloseModal = () => {
    if (selectedProvider === 'google-analytics') {
      if (ga4StartFetcher.state === 'idle') {
        setSelectedProvider(null)
        resetGa4State()
      }
    } else {
      if (!uploading) setSelectedProvider(null)
    }
  }

  const uploading = uploadFetcher.state !== 'idle'
  const deleting = deleteFetcher.state !== 'idle'
  const ga4Connecting = ga4ConnectFetcher.state !== 'idle'
  const ga4Starting = ga4StartFetcher.state !== 'idle'

  const isFileBased =
    selectedProvider && FILE_BASED_PROVIDERS.has(selectedProvider)
  const isGA4 = selectedProvider === 'google-analytics'

  const providerFileType = selectedProvider
    ? PROVIDER_FILE_TYPES[selectedProvider] || ''
    : ''

  const selectedGa4Property = ga4Properties.find(
    (p) => p.propertyId === ga4SelectedProperty,
  )

  return (
    <div className='space-y-8'>
      <div>
        <Text as='h3' size='base' weight='semibold' colour='primary'>
          {t('project.settings.dataImport.importFrom')}
        </Text>
        <Text as='p' size='sm' colour='muted' className='mt-1'>
          {t('project.settings.dataImport.importFromDesc')}
        </Text>

        <div className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {IMPORT_PROVIDERS.map((provider) => {
            const Icon = PROVIDER_ICONS[provider] || FileTextIcon
            const hasActive = imports.some(
              (i) => i.status === 'pending' || i.status === 'processing',
            )
            const name = PROVIDER_DISPLAY_NAMES[provider] || provider
            const subtitle =
              provider === 'google-analytics'
                ? t('project.settings.dataImport.google-analytics.fileType')
                : PROVIDER_FILE_TYPES[provider] || ''

            return (
              <button
                key={provider}
                type='button'
                disabled={hasActive}
                onClick={() => handleProviderClick(provider)}
                className={cx(
                  'group relative flex flex-col items-start rounded-lg border p-4 text-left transition-all',
                  hasActive
                    ? 'cursor-not-allowed border-gray-200 opacity-50 dark:border-slate-800'
                    : 'cursor-pointer border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-slate-700/80 dark:hover:border-slate-600 dark:hover:bg-slate-900/50',
                )}
              >
                <div className='flex items-center gap-3'>
                  <div className='flex size-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-800'>
                    <Icon className='size-5' />
                  </div>
                  <div>
                    <Text as='p' size='sm' weight='semibold' colour='primary'>
                      {name}
                    </Text>
                    <Text as='p' size='xs' colour='muted'>
                      {subtitle}
                    </Text>
                  </div>
                </div>
                <Text as='p' size='xs' colour='muted' className='mt-2'>
                  {t(`project.settings.dataImport.${provider}.description`)}
                </Text>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <Text as='h3' size='base' weight='semibold' colour='primary'>
          {t('project.settings.dataImport.importHistory')}
        </Text>

        {loading ? (
          <div className='mt-4 flex justify-center py-8'>
            <Loader />
          </div>
        ) : imports.length === 0 ? (
          <div className='mt-4 rounded-lg border border-dashed border-gray-300 py-8 text-center dark:border-slate-700'>
            <UploadIcon className='mx-auto size-8 text-gray-400 dark:text-gray-500' />
            <Text as='p' size='sm' colour='muted' className='mt-2'>
              {t('project.settings.dataImport.noImports')}
            </Text>
          </div>
        ) : (
          <div className='mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-slate-800'>
            <table className='min-w-full divide-y divide-gray-200 dark:divide-slate-800'>
              <thead className='bg-gray-50 dark:bg-slate-900'>
                <tr>
                  <th
                    scope='col'
                    className='px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-900 uppercase dark:text-white'
                  >
                    {t('project.settings.dataImport.provider')}
                  </th>
                  <th
                    scope='col'
                    className='px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-900 uppercase dark:text-white'
                  >
                    {t('project.settings.dataImport.status')}
                  </th>
                  <th
                    scope='col'
                    className='hidden px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-900 uppercase sm:table-cell dark:text-white'
                  >
                    {t('project.settings.dataImport.dateRange')}
                  </th>
                  <th
                    scope='col'
                    className='hidden px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-900 uppercase sm:table-cell dark:text-white'
                  >
                    {t('project.settings.dataImport.rows')}
                  </th>
                  <th
                    scope='col'
                    className='hidden px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-900 uppercase md:table-cell dark:text-white'
                  >
                    {t('project.settings.dataImport.created')}
                  </th>
                  <th scope='col' />
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 bg-white dark:divide-slate-800 dark:bg-slate-950'>
                {imports.map((imp) => (
                  <tr
                    key={imp.id}
                    className='bg-white hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-900/50'
                  >
                    <td className='px-4 py-3 text-sm font-medium whitespace-nowrap text-gray-900 dark:text-gray-100'>
                      {PROVIDER_DISPLAY_NAMES[imp.provider] || imp.provider}
                    </td>
                    <td className='px-4 py-3'>
                      <StatusBadge
                        status={imp.status}
                        label={statusLabels[imp.status]}
                      />
                      {imp.status === 'failed' && imp.errorMessage && (
                        <Text
                          as='p'
                          size='xs'
                          colour='error'
                          className='mt-1 max-w-xs'
                        >
                          {imp.errorMessage}
                        </Text>
                      )}
                    </td>
                    <td className='hidden px-4 py-3 text-sm whitespace-nowrap text-gray-900 sm:table-cell dark:text-gray-100'>
                      {imp.dateFrom && imp.dateTo ? (
                        <>
                          {dayjs(imp.dateFrom).format('MMM D, YYYY')}
                          {' — '}
                          {dayjs(imp.dateTo).format('MMM D, YYYY')}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className='hidden px-4 py-3 text-sm whitespace-nowrap text-gray-900 sm:table-cell dark:text-gray-100'>
                      {imp.importedRows > 0
                        ? imp.importedRows.toLocaleString()
                        : '—'}
                    </td>
                    <td className='hidden px-4 py-3 text-sm whitespace-nowrap text-gray-900 md:table-cell dark:text-gray-100'>
                      {dayjs(imp.createdAt).format('MMM D, YYYY HH:mm')}
                    </td>
                    <td className='px-4 py-3 text-right text-sm whitespace-nowrap'>
                      {(imp.status === 'completed' ||
                        imp.status === 'failed') && (
                        <div className='flex items-center justify-end'>
                          <button
                            type='button'
                            onClick={() => setDeleteTarget(imp)}
                            className='rounded p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300'
                            title={t(
                              'project.settings.dataImport.deleteImport',
                            )}
                          >
                            <TrashIcon className='size-4' />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* File upload modal for file-based providers */}
      <Modal
        isOpened={!!isFileBased}
        onClose={handleCloseModal}
        title={t('project.settings.dataImport.importFromProvider', {
          provider: selectedProvider
            ? PROVIDER_DISPLAY_NAMES[selectedProvider] || selectedProvider
            : '',
        })}
        size='medium'
        message={
          <div className='space-y-4'>
            <Text as='p' size='sm' colour='muted'>
              <Trans
                i18nKey='project.settings.dataImport.uploadInstructions'
                t={t}
                components={{
                  1: (
                    <a
                      href='https://swetrix.com/docs/data-import'
                      target='_blank'
                      rel='noreferrer'
                      className='text-indigo-600 hover:text-indigo-500 dark:text-slate-300 dark:hover:text-white'
                    />
                  ),
                }}
              />
            </Text>

            <FileUpload
              accept={providerFileType}
              loading={uploading}
              onFile={handleUpload}
              label={
                uploading ? (
                  t('project.settings.dataImport.uploadingProcessing')
                ) : (
                  <Text as='span' size='sm' colour='muted'>
                    <Text as='span' weight='medium' colour='primary'>
                      {t('project.settings.dataImport.clickToUpload')}
                    </Text>{' '}
                    {t('project.settings.dataImport.orDragDrop')}
                  </Text>
                )
              }
              hint={
                uploading
                  ? undefined
                  : t('project.settings.dataImport.maxFileSize', {
                      fileType: providerFileType.toUpperCase(),
                      maxSize: 100,
                    })
              }
            />
          </div>
        }
        closeText={t('common.cancel')}
      />

      {/* GA4 OAuth + property selection modal */}
      <Modal
        isOpened={!!isGA4}
        onClose={handleCloseModal}
        title={t('project.settings.dataImport.importFromProvider', {
          provider: 'Google Analytics 4',
        })}
        size='medium'
        submitText={
          ga4Connected && ga4Properties.length > 0
            ? t('project.settings.dataImport.google-analytics.startImport')
            : undefined
        }
        onSubmit={
          ga4Connected && ga4Properties.length > 0
            ? handleGa4StartImport
            : undefined
        }
        isLoading={ga4Starting}
        closeText={t('common.cancel')}
        message={
          <div className='space-y-4'>
            {!ga4Connected ? (
              <>
                <Text as='p' size='sm' colour='muted'>
                  {t(
                    'project.settings.dataImport.google-analytics.connectDesc',
                  )}
                </Text>
                <Button
                  secondary
                  large
                  onClick={handleGa4Connect}
                  loading={ga4Connecting}
                  className='flex w-full items-center justify-center gap-2'
                >
                  {!ga4Connecting && <GoogleAnalyticsSVG className='size-5' />}
                  {ga4Connecting
                    ? t(
                        'project.settings.dataImport.google-analytics.connecting',
                      )
                    : t(
                        'project.settings.dataImport.google-analytics.connectGoogle',
                      )}
                </Button>
              </>
            ) : ga4LoadingProperties ? (
              <div className='space-y-4'>
                <div className='flex items-center justify-center py-6'>
                  <Loader className='pt-0' />
                  <Text as='p' size='sm'>
                    {t(
                      'project.settings.dataImport.google-analytics.loadingProperties',
                    )}
                  </Text>
                </div>
              </div>
            ) : ga4Properties.length === 0 ? (
              <Text
                as='p'
                size='sm'
                colour='muted'
                className='py-4 text-center'
              >
                {t('project.settings.dataImport.google-analytics.noProperties')}
              </Text>
            ) : (
              <>
                <Select
                  label={t(
                    'project.settings.dataImport.google-analytics.selectProperty',
                  )}
                  items={ga4Properties}
                  selectedItem={selectedGa4Property}
                  title={
                    selectedGa4Property
                      ? `${selectedGa4Property.displayName} (${selectedGa4Property.propertyId})`
                      : ''
                  }
                  keyExtractor={(prop) => prop.propertyId}
                  labelExtractor={(prop) =>
                    `${prop.displayName} (${prop.propertyId})`
                  }
                  onSelect={(prop) => setGa4SelectedProperty(prop.propertyId)}
                />
                <Text as='p' size='xs' colour='muted'>
                  {t('project.settings.dataImport.google-analytics.importNote')}
                </Text>
              </>
            )}
          </div>
        }
      />

      <Modal
        isOpened={!!deleteTarget}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        type='warning'
        title={t('project.settings.dataImport.deleteImport')}
        message={
          <Text as='p'>
            {t('project.settings.dataImport.deleteImportConfirm', {
              count: deleteTarget?.importedRows || 0,
            })}
          </Text>
        }
        submitText={t('common.delete')}
        closeText={t('common.cancel')}
        submitType='danger'
        onSubmit={handleDelete}
        isLoading={deleting}
      />
    </div>
  )
}
