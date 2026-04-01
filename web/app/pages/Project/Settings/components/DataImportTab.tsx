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
import { useTranslation } from 'react-i18next'

import { DataImport } from '~/lib/models/Project'
import Modal from '~/ui/Modal'
import Loader from '~/ui/Loader'
import { Text } from '~/ui/Text'
import UmamiSVG from '~/ui/icons/Umami'

const PROVIDERS = ['umami'] as const

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

interface DataImportTabProps {
  projectId: string
}

export default function DataImportTab({ projectId }: DataImportTabProps) {
  const { t } = useTranslation('common')
  const [imports, setImports] = useState<DataImport[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DataImport | null>(null)
  const [deleting, setDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const statusLabels: Record<DataImport['status'], string> = {
    pending: t('project.settings.dataImport.statusPending'),
    processing: t('project.settings.dataImport.statusProcessing'),
    completed: t('project.settings.dataImport.statusCompleted'),
    failed: t('project.settings.dataImport.statusFailed'),
  }

  const fetchImports = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/data-import?endpoint=${encodeURIComponent(`data-import/${projectId}`)}`,
      )
      if (res.ok) {
        const data = await res.json()
        setImports(Array.isArray(data) ? data : [])
      }
    } catch {
      // silently fail on poll
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchImports()
  }, [fetchImports])

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

  const handleUpload = async (file: File) => {
    if (!selectedProvider) return

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('provider', selectedProvider)

      const res = await fetch(
        `/api/data-import?endpoint=${encodeURIComponent(`data-import/${projectId}/upload`)}`,
        {
          method: 'POST',
          body: formData,
        },
      )

      const result = await res.json()

      if (!res.ok) {
        toast.error(
          result.error || t('project.settings.dataImport.uploadFailed'),
        )
        return
      }

      toast.success(t('project.settings.dataImport.importStarted'))
      setSelectedProvider(null)
      fetchImports()
    } catch {
      toast.error(t('project.settings.dataImport.uploadFailed'))
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    setDeleting(true)

    try {
      const res = await fetch(
        `/api/data-import?endpoint=${encodeURIComponent(`data-import/${projectId}/${deleteTarget.id}`)}`,
        { method: 'DELETE' },
      )

      const result = await res.json()

      if (!res.ok) {
        toast.error(
          result.error || t('project.settings.dataImport.deleteFailed'),
        )
        return
      }

      toast.success(t('project.settings.dataImport.importDeleted'))
      setDeleteTarget(null)
      fetchImports()
    } catch {
      toast.error(t('project.settings.dataImport.deleteFailed'))
    } finally {
      setDeleting(false)
    }
  }

  const providerFileType = selectedProvider
    ? t(`project.settings.dataImport.${selectedProvider}.fileType`)
    : ''
  const providerExportGuide = selectedProvider
    ? t(`project.settings.dataImport.${selectedProvider}.exportGuide`)
    : ''

  return (
    <div className='space-y-8'>
      <div>
        <Text as='h3' size='base' weight='semibold' colour='primary'>
          {t('project.settings.dataImport.importFrom')}
        </Text>
        <Text
          as='p'
          size='sm'
          colour='inherit'
          className='mt-1 text-gray-500 dark:text-gray-400'
        >
          {t('project.settings.dataImport.importFromDesc')}
        </Text>

        <div className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {PROVIDERS.map((providerId) => {
            const Icon = providerId === 'umami' ? UmamiSVG : FileTextIcon
            const hasActive = imports.some(
              (i) => i.status === 'pending' || i.status === 'processing',
            )
            const name =
              providerId.charAt(0).toUpperCase() + providerId.slice(1)
            const description = t(
              `project.settings.dataImport.${providerId}.description`,
            )
            const fileType = t(
              `project.settings.dataImport.${providerId}.fileType`,
            )

            return (
              <button
                key={providerId}
                type='button'
                disabled={hasActive}
                onClick={() => setSelectedProvider(providerId)}
                className={cx(
                  'group relative flex flex-col items-start rounded-xl border p-4 text-left transition-all',
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
                    <Text
                      as='p'
                      size='xs'
                      colour='inherit'
                      className='text-gray-500 dark:text-gray-400'
                    >
                      {fileType}
                    </Text>
                  </div>
                </div>
                <Text
                  as='p'
                  size='xs'
                  colour='inherit'
                  className='mt-2 text-gray-500 dark:text-gray-400'
                >
                  {description}
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
            <Text
              as='p'
              size='sm'
              colour='inherit'
              className='mt-2 text-gray-500 dark:text-gray-400'
            >
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
                    <td className='px-4 py-3 text-sm font-medium whitespace-nowrap text-gray-900 capitalize dark:text-gray-100'>
                      {imp.provider}
                    </td>
                    <td className='px-4 py-3 whitespace-nowrap'>
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
                          truncate
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
                        <button
                          type='button'
                          onClick={() => setDeleteTarget(imp)}
                          className='text-gray-400 transition-colors hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400'
                          title={t('project.settings.dataImport.deleteImport')}
                        >
                          <TrashIcon className='size-4' />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpened={!!selectedProvider}
        onClose={() => {
          if (!uploading) setSelectedProvider(null)
        }}
        title={t('project.settings.dataImport.importFromProvider', {
          provider: selectedProvider
            ? selectedProvider.charAt(0).toUpperCase() +
              selectedProvider.slice(1)
            : '',
        })}
        size='medium'
        message={
          <div className='space-y-4'>
            <div className='rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800/50'>
              <Text
                as='p'
                size='sm'
                weight='medium'
                colour='inherit'
                className='text-gray-700 dark:text-gray-300'
              >
                {t('project.settings.dataImport.howToExport')}
              </Text>
              <Text
                as='p'
                size='sm'
                colour='inherit'
                className='mt-1 text-gray-500 dark:text-gray-400'
              >
                {providerExportGuide}
              </Text>
            </div>

            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
            <div
              className={cx(
                'group relative cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors',
                uploading
                  ? 'cursor-not-allowed border-gray-200 dark:border-slate-700'
                  : 'border-gray-300 hover:border-gray-400 dark:border-slate-600 dark:hover:border-slate-500',
              )}
              onClick={() => {
                if (!uploading) fileInputRef.current?.click()
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (uploading) return
                const file = e.dataTransfer.files?.[0]
                if (file) handleUpload(file)
              }}
            >
              <input
                ref={fileInputRef}
                type='file'
                className='hidden'
                accept={providerFileType}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUpload(file)
                  e.target.value = ''
                }}
                disabled={uploading}
              />

              {uploading ? (
                <div className='space-y-2'>
                  <SpinnerIcon className='mx-auto size-8 animate-spin text-gray-400' />
                  <Text
                    as='p'
                    size='sm'
                    colour='inherit'
                    className='text-gray-500 dark:text-gray-400'
                  >
                    {t('project.settings.dataImport.uploadingProcessing')}
                  </Text>
                </div>
              ) : (
                <div className='space-y-2'>
                  <UploadIcon className='mx-auto size-8 text-gray-400 dark:text-gray-500' />
                  <Text
                    as='p'
                    size='sm'
                    colour='inherit'
                    className='text-gray-600 dark:text-gray-300'
                  >
                    <Text
                      as='span'
                      weight='medium'
                      colour='inherit'
                      className='text-gray-900 dark:text-gray-100'
                    >
                      {t('project.settings.dataImport.clickToUpload')}
                    </Text>{' '}
                    {t('project.settings.dataImport.orDragDrop')}
                  </Text>
                  <Text
                    as='p'
                    size='xs'
                    colour='inherit'
                    className='text-gray-500 dark:text-gray-400'
                  >
                    {t('project.settings.dataImport.maxFileSize', {
                      fileType: providerFileType.toUpperCase(),
                    })}
                  </Text>
                </div>
              )}
            </div>
          </div>
        }
        closeText={t('common.cancel')}
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
