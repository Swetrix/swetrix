import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _size from 'lodash/size'
import { PencilIcon, Trash2Icon, PlusIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import { toast } from 'sonner'

import { Annotation } from '~/lib/models/Project'
import AnnotationModal from '~/modals/AnnotationModal'
import type { ProjectViewActionData } from '~/routes/projects.$id'
import Button from '~/ui/Button'
import Loader from '~/ui/Loader'
import Modal from '~/ui/Modal'
import Pagination from '~/ui/Pagination'

const ANNOTATIONS_PER_PAGE = 10

interface AnnotationsProps {
  projectId: string
  allowedToManage: boolean
}

const Annotations = ({ projectId, allowedToManage }: AnnotationsProps) => {
  const { t } = useTranslation('common')
  const fetcher = useFetcher<ProjectViewActionData>()
  const lastHandledData = useRef<ProjectViewActionData | null>(null)

  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | undefined>()
  const [deleteAnnotationItem, setDeleteAnnotationItem] = useState<Annotation | null>(null)

  const actionLoading = fetcher.state !== 'idle'

  const loadAnnotations = useCallback(() => {
    fetcher.submit({ intent: 'get-annotations', password: '' }, { method: 'POST', action: `/projects/${projectId}` })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // Handle fetcher responses
  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) return
    if (lastHandledData.current === fetcher.data) return
    lastHandledData.current = fetcher.data

    const { intent, success, data, error } = fetcher.data

    if (success) {
      if (intent === 'get-annotations' && data) {
        const result = data as Annotation[]
        const sorted = result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setAnnotations(sorted)
        const totalPages = Math.max(1, Math.ceil(sorted.length / ANNOTATIONS_PER_PAGE))
        setPage((prev) => Math.min(prev, totalPages))
        setIsLoading(false)
      } else if (intent === 'create-annotation') {
        toast.success(t('apiNotifications.annotationCreated'))
        setIsModalOpen(false)
        setEditingAnnotation(undefined)
        loadAnnotations()
      } else if (intent === 'update-annotation') {
        toast.success(t('apiNotifications.annotationUpdated'))
        setIsModalOpen(false)
        setEditingAnnotation(undefined)
        loadAnnotations()
      } else if (intent === 'delete-annotation') {
        toast.success(t('apiNotifications.annotationDeleted'))
        setDeleteAnnotationItem(null)
        setIsModalOpen(false)
        setEditingAnnotation(undefined)
        loadAnnotations()
      }
    } else if (error) {
      toast.error(error)
      setIsLoading(false)
    }
  }, [fetcher.state, fetcher.data, t, loadAnnotations])

  useEffect(() => {
    loadAnnotations()
  }, [loadAnnotations])

  const totalPages = Math.ceil(_size(annotations) / ANNOTATIONS_PER_PAGE)
  const paginatedAnnotations = annotations.slice((page - 1) * ANNOTATIONS_PER_PAGE, page * ANNOTATIONS_PER_PAGE)

  const openCreateModal = () => {
    setEditingAnnotation(undefined)
    setIsModalOpen(true)
  }

  const openEditModal = (annotation: Annotation) => {
    setEditingAnnotation(annotation)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingAnnotation(undefined)
  }

  const handleSubmit = (date: string, text: string) => {
    if (actionLoading) return

    if (editingAnnotation) {
      fetcher.submit(
        { intent: 'update-annotation', annotationId: editingAnnotation.id, date, text },
        { method: 'POST', action: `/projects/${projectId}` },
      )
    } else {
      fetcher.submit({ intent: 'create-annotation', date, text }, { method: 'POST', action: `/projects/${projectId}` })
    }
  }

  const handleDelete = () => {
    if (!deleteAnnotationItem || actionLoading) return

    fetcher.submit(
      { intent: 'delete-annotation', annotationId: deleteAnnotationItem.id },
      { method: 'POST', action: `/projects/${projectId}` },
    )
  }

  const handleDeleteFromModal = () => {
    if (!editingAnnotation || actionLoading) return

    fetcher.submit(
      { intent: 'delete-annotation', annotationId: editingAnnotation.id },
      { method: 'POST', action: `/projects/${projectId}` },
    )
  }

  if (isLoading) {
    return (
      <div className='flex justify-center py-8'>
        <Loader />
      </div>
    )
  }

  return (
    <div>
      <div className='mb-4 flex items-center justify-between'>
        <div>
          <h3 className='text-lg font-medium text-gray-900 dark:text-gray-50'>
            {t('project.settings.annotations.title')}
          </h3>
          <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
            {t('project.settings.annotations.description')}
          </p>
        </div>
        {allowedToManage ? (
          <Button type='button' onClick={openCreateModal} primary regular>
            <PlusIcon className='mr-1 h-4 w-4' />
            {t('project.settings.annotations.add')}
          </Button>
        ) : null}
      </div>

      {_isEmpty(annotations) ? (
        <div className='rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-slate-700'>
          <p className='text-gray-500 dark:text-gray-400'>{t('project.settings.annotations.empty')}</p>
          {allowedToManage ? (
            <Button type='button' onClick={openCreateModal} className='mt-4' primary regular>
              <PlusIcon className='mr-1 h-4 w-4' />
              {t('project.settings.annotations.addFirst')}
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <div className='overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700'>
            <table className='min-w-full divide-y divide-gray-200 dark:divide-slate-700'>
              <thead className='bg-gray-50 dark:bg-slate-800'>
                <tr>
                  <th
                    scope='col'
                    className='px-4 py-3 text-left text-xs font-bold tracking-wider text-gray-900 uppercase dark:text-white'
                  >
                    {t('project.settings.annotations.date')}
                  </th>
                  <th
                    scope='col'
                    className='px-4 py-3 text-left text-xs font-bold tracking-wider text-gray-900 uppercase dark:text-white'
                  >
                    {t('project.settings.annotations.text')}
                  </th>
                  {allowedToManage ? <th /> : null}
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 bg-white dark:divide-slate-700 dark:bg-slate-900'>
                {_map(paginatedAnnotations, (annotation) => (
                  <tr key={annotation.id} className='hover:bg-gray-50 dark:hover:bg-slate-800/50'>
                    <td className='px-4 py-3 text-sm whitespace-nowrap text-gray-900 dark:text-gray-100'>
                      {new Date(annotation.date).toLocaleDateString()}
                    </td>
                    <td className='px-4 py-3 text-sm text-gray-700 dark:text-gray-300'>
                      <span className='line-clamp-2'>{annotation.text}</span>
                    </td>
                    {allowedToManage ? (
                      <td className='px-4 py-3 text-right text-sm whitespace-nowrap'>
                        <div className='flex items-center justify-end gap-2'>
                          <button
                            type='button'
                            onClick={() => openEditModal(annotation)}
                            className='rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-slate-700 dark:hover:text-gray-200'
                            title={t('common.edit')}
                          >
                            <PencilIcon className='h-4 w-4' />
                          </button>
                          <button
                            type='button'
                            onClick={() => setDeleteAnnotationItem(annotation)}
                            className='rounded p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300'
                            title={t('common.delete')}
                          >
                            <Trash2Icon className='h-4 w-4' />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div className='mt-4 flex justify-center'>
              <Pagination page={page} setPage={setPage} pageAmount={totalPages} total={_size(annotations)} />
            </div>
          ) : null}
        </>
      )}

      <AnnotationModal
        isOpened={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onDelete={editingAnnotation ? handleDeleteFromModal : undefined}
        loading={actionLoading}
        annotation={editingAnnotation}
        allowedToManage={allowedToManage}
      />

      <Modal
        isOpened={!!deleteAnnotationItem}
        onClose={() => setDeleteAnnotationItem(null)}
        onSubmit={handleDelete}
        title={t('project.settings.annotations.deleteTitle')}
        message={t('project.settings.annotations.deleteConfirm')}
        submitText={t('common.delete')}
        closeText={t('common.cancel')}
        submitType='danger'
        type='error'
        isLoading={actionLoading}
      />
    </div>
  )
}

export default Annotations
