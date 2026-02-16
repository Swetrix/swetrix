import { InfoIcon } from '@phosphor-icons/react'
import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Annotation } from '~/lib/models/Project'
import Datepicker from '~/ui/Datepicker'
import Spin from '~/ui/icons/Spin'
import Modal from '~/ui/Modal'
import Textarea from '~/ui/Textarea'
import { cn } from '~/utils/generic'

const MAX_ANNOTATION_LENGTH = 120

interface AnnotationModalProps {
  onClose: () => void
  onSubmit: (date: string, text: string) => void
  onDelete?: () => void
  isOpened: boolean
  loading: boolean
  annotation?: Annotation
  defaultDate?: string
  allowedToManage?: boolean
}

const AnnotationModal = ({
  onClose,
  onSubmit,
  onDelete,
  isOpened,
  annotation,
  loading,
  defaultDate,
  allowedToManage = true,
}: AnnotationModalProps) => {
  const { t } = useTranslation('common')

  const initialDate = useMemo(
    () => (isOpened ? annotation?.date || defaultDate || '' : ''),
    [isOpened, annotation?.date, defaultDate],
  )
  const initialText = useMemo(
    () => (isOpened ? annotation?.text || '' : ''),
    [isOpened, annotation?.text],
  )

  const [date, setDate] = useState(initialDate)
  const [text, setText] = useState(initialText)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing initial state with UI
    setDate(initialDate)
    setText(initialText)
  }, [initialDate, initialText])

  const _onClose = () => {
    setTimeout(() => {
      setDate('')
      setText('')
    }, 300)
    onClose()
  }

  const _onSubmit = () => {
    if (!date || !text.trim() || !allowedToManage) {
      return
    }

    onSubmit(date, text.trim())
  }

  const _onDelete = () => {
    if (!onDelete || !allowedToManage) {
      return
    }

    onDelete()
  }

  const isEditMode = !!annotation

  return (
    <Modal
      isLoading={loading}
      onClose={_onClose}
      customButtons={
        <div className='flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-between'>
          {isEditMode && onDelete && allowedToManage ? (
            <button
              type='button'
              onClick={_onDelete}
              disabled={loading}
              className='inline-flex w-full justify-center rounded-md border border-red-300 bg-white px-4 py-2 text-base font-medium text-red-700 transition-colors hover:bg-red-50 sm:w-auto sm:text-sm dark:border-red-600 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-900/20'
            >
              {t('common.delete')}
            </button>
          ) : (
            <div />
          )}
          <div className='flex flex-col-reverse gap-2 sm:flex-row'>
            <button
              type='button'
              onClick={_onClose}
              className='inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto sm:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-gray-50 dark:hover:bg-gray-700'
            >
              {t('common.cancel')}
            </button>
            <button
              type='button'
              onClick={_onSubmit}
              disabled={!date || !text.trim() || !allowedToManage || loading}
              className='inline-flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-base font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:text-sm'
            >
              {loading ? <Spin alwaysLight /> : null}
              {t('common.save')}
            </button>
          </div>
        </div>
      }
      message={
        <div className='space-y-4'>
          <div>
            <label className='mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200'>
              {t('modals.annotation.date')}
              <span className='text-red-600'>*</span>
            </label>
            <Datepicker
              mode='single'
              value={date ? [new Date(date + 'T00:00:00')] : []}
              onChange={(dates) => {
                if (dates.length > 0 && allowedToManage) {
                  const d = dates[0]
                  const year = d.getFullYear()
                  const month = String(d.getMonth() + 1).padStart(2, '0')
                  const day = String(d.getDate()).padStart(2, '0')
                  setDate(`${year}-${month}-${day}`)
                }
              }}
              options={{
                altInputClass: cn(
                  'w-full rounded-md border-0 bg-white px-3 py-2 text-sm text-gray-900 ring-1 ring-gray-300 focus:ring-slate-900 dark:focus:ring-slate-300 dark:bg-slate-900 dark:text-gray-100 dark:ring-slate-800/50',
                  {
                    'cursor-not-allowed opacity-50': !allowedToManage,
                  },
                ),
              }}
            />
          </div>
          <div>
            <Textarea
              name='annotation-text-input'
              label={t('modals.annotation.text')}
              value={text}
              onChange={(e) => {
                if (e.target.value.length <= MAX_ANNOTATION_LENGTH) {
                  setText(e.target.value)
                }
              }}
              disabled={!allowedToManage}
              rows={3}
            />
            <p className='mt-1 text-right text-xs text-gray-500 dark:text-gray-400'>
              {text.length}/{MAX_ANNOTATION_LENGTH}
            </p>
          </div>
          <div className='flex items-start gap-2 rounded-md bg-blue-50 p-3 dark:bg-blue-900/20'>
            <InfoIcon className='mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400' />
            <p className='text-xs text-blue-700 dark:text-blue-300'>
              {t('modals.annotation.warning')}
            </p>
          </div>
        </div>
      }
      title={
        isEditMode
          ? t('modals.annotation.editTitle')
          : t('modals.annotation.addTitle')
      }
      isOpened={isOpened}
      overflowVisible
    />
  )
}

export default AnnotationModal
