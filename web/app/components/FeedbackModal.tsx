import { XIcon } from '@phosphor-icons/react'
import type { ClipboardEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import { toast } from 'sonner'

import type { FeedbackActionData } from '~/routes/feedback'
import Button from '~/ui/Button'
import FileUpload from '~/ui/FileUpload'
import Modal from '~/ui/Modal'
import { Text } from '~/ui/Text'
import Textarea from '~/ui/Textarea'
import routes from '~/utils/routes'

interface FeedbackModalProps {
  isOpened: boolean
  onClose: () => void
}

interface AttachmentItem {
  id: string
  file: File
  previewUrl: string
}

const ACCEPTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]
const ACCEPTED_IMAGE_INPUT = ACCEPTED_IMAGE_TYPES.join(',')
const MAX_ATTACHMENTS = 7
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024
const MAX_MESSAGE_LENGTH = 2000

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const getAttachmentId = (file: File) => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `${file.name}-${file.lastModified}-${Math.random()}`
}

const FeedbackModal = ({ isOpened, onClose }: FeedbackModalProps) => {
  const { t } = useTranslation('common')
  const fetcher = useFetcher<FeedbackActionData>()
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<AttachmentItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const attachmentsRef = useRef<AttachmentItem[]>([])
  const handledDataRef = useRef<FeedbackActionData | undefined>(undefined)
  const isSubmitting = fetcher.state !== 'idle'

  useEffect(() => {
    attachmentsRef.current = attachments
  }, [attachments])

  useEffect(
    () => () => {
      attachmentsRef.current.forEach((attachment) => {
        URL.revokeObjectURL(attachment.previewUrl)
      })
    },
    [],
  )

  const resetForm = useCallback(() => {
    setMessage('')
    setError(null)
    setAttachments((prev) => {
      prev.forEach((attachment) => {
        URL.revokeObjectURL(attachment.previewUrl)
      })
      return []
    })
  }, [])

  useEffect(() => {
    if (
      fetcher.state !== 'idle' ||
      !fetcher.data ||
      handledDataRef.current === fetcher.data
    ) {
      return
    }

    handledDataRef.current = fetcher.data

    if (fetcher.data.error) {
      toast.error(fetcher.data.error)
      return
    }

    if (fetcher.data.success) {
      toast.success(t('feedback.sent'))
      resetForm()
      onClose()
    }
  }, [fetcher.data, fetcher.state, onClose, resetForm, t])

  const addFiles = useCallback(
    (files: File[]) => {
      if (!files.length) return

      const validFiles = files.filter((file) => {
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          toast.error(t('feedback.errors.imageOnly'))
          return false
        }

        if (file.size > MAX_ATTACHMENT_SIZE) {
          toast.error(
            t('feedback.errors.imageTooLarge', {
              size: formatFileSize(MAX_ATTACHMENT_SIZE),
            }),
          )
          return false
        }

        return true
      })

      if (!validFiles.length) return

      setAttachments((prev) => {
        const remainingSlots = MAX_ATTACHMENTS - prev.length

        if (remainingSlots <= 0) {
          toast.error(
            t('feedback.errors.tooManyImages', { count: MAX_ATTACHMENTS }),
          )
          return prev
        }

        if (validFiles.length > remainingSlots) {
          toast.error(
            t('feedback.errors.tooManyImages', { count: MAX_ATTACHMENTS }),
          )
        }

        const next = validFiles.slice(0, remainingSlots).map((file) => ({
          id: getAttachmentId(file),
          file,
          previewUrl: URL.createObjectURL(file),
        }))

        return [...prev, ...next]
      })
    },
    [t],
  )

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((item) => item.id === id)
      if (attachment) {
        URL.revokeObjectURL(attachment.previewUrl)
      }

      return prev.filter((item) => item.id !== id)
    })
  }, [])

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      const files = Array.from(event.clipboardData.files).filter((file) =>
        file.type.startsWith('image/'),
      )

      if (!files.length) return

      event.preventDefault()
      addFiles(files)
    },
    [addFiles],
  )

  const handleSubmit = useCallback(() => {
    const trimmedMessage = message.trim()

    if (!trimmedMessage) {
      setError(t('feedback.errors.messageRequired'))
      return
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      setError(
        t('feedback.errors.messageTooLong', { count: MAX_MESSAGE_LENGTH }),
      )
      return
    }

    setError(null)

    const formData = new FormData()
    formData.set('message', trimmedMessage)

    attachments.forEach(({ file }) => {
      formData.append('attachments', file)
    })

    fetcher.submit(formData, {
      method: 'POST',
      action: routes.feedback,
      encType: 'multipart/form-data',
    })
  }, [attachments, fetcher, message, t])

  const handleClose = useCallback(() => {
    if (isSubmitting) return
    resetForm()
    onClose()
  }, [isSubmitting, onClose, resetForm])

  return (
    <Modal
      title={t('feedback.title')}
      message={
        <div className='space-y-4' onPaste={handlePaste}>
          <Text as='p' size='sm' colour='secondary'>
            {t('feedback.description')}
          </Text>
          <Textarea
            value={message}
            rows={5}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder={t('feedback.placeholder')}
            aria-label={t('feedback.inputLabel')}
            error={error}
            disabled={isSubmitting}
            classes={{ textarea: 'min-h-32 resize-none' }}
            onChange={(event) => {
              setMessage(event.target.value)
              if (error) setError(null)
            }}
          />
          <FileUpload
            accept={ACCEPTED_IMAGE_INPUT}
            variant='mini'
            multiple
            disabled={isSubmitting || attachments.length >= MAX_ATTACHMENTS}
            onFile={(file) => addFiles([file])}
            onFiles={addFiles}
            label={t('feedback.addImage')}
            hint={t('feedback.addImageHint')}
            className='rounded-lg'
          />
          {attachments.length ? (
            <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className='group relative overflow-hidden rounded-lg bg-gray-50 ring-1 ring-gray-200/80 dark:bg-slate-900 dark:ring-slate-700/60'
                >
                  <img
                    src={attachment.previewUrl}
                    alt=''
                    className='aspect-video w-full object-cover'
                  />
                  <div className='flex min-w-0 items-center justify-between gap-2 px-2 py-1.5'>
                    <Text
                      as='span'
                      size='xxs'
                      colour='muted'
                      className='min-w-0 truncate'
                      title={attachment.file.name}
                    >
                      {attachment.file.name}
                    </Text>
                    <Text
                      as='span'
                      size='xxs'
                      colour='muted'
                      className='shrink-0'
                    >
                      {formatFileSize(attachment.file.size)}
                    </Text>
                  </div>
                  <Button
                    variant='icon'
                    size='xs'
                    aria-label={t('feedback.removeImage')}
                    disabled={isSubmitting}
                    className='absolute top-1 right-1 bg-white/95 p-1 text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100 dark:bg-slate-950/95 dark:text-gray-200 dark:ring-slate-700 dark:hover:bg-slate-900'
                    onClick={() => removeAttachment(attachment.id)}
                  >
                    <XIcon className='size-3.5' aria-hidden='true' />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      }
      isOpened={isOpened}
      onClose={handleClose}
      onSubmit={handleSubmit}
      submitText={t('feedback.send')}
      submitDisabled={isSubmitting || !message.trim()}
      isLoading={isSubmitting}
      size='regular'
    />
  )
}

export default FeedbackModal
