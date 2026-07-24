import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import {
  ArrowSquareOutIcon,
  CaretLeftIcon,
  CaretRightIcon,
  FileIcon,
  MagnifyingGlassIcon,
  MagnifyingGlassPlusIcon,
  XIcon,
} from '@phosphor-icons/react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { Badge } from '~/ui/Badge'
import Input from '~/ui/Input'
import Pagination from '~/ui/Pagination'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { cn, nLocaleFormatter } from '~/utils/generic'

import { EmptyState } from './components'
import { adminLinkClassName } from './UsersTab'
import type {
  AdminFeedbackItem,
  AdminFeedbackList,
  AdminFeedbackType,
} from './types'

dayjs.extend(relativeTime)

const FEEDBACK_TYPES: {
  key: AdminFeedbackType
  label: string
  countKey: keyof AdminFeedbackList['counts']
}[] = [
  { key: 'user', label: 'User feedback', countKey: 'user' },
  { key: 'cancellation', label: 'Cancellations', countKey: 'cancellation' },
  { key: 'deletion', label: 'Account deletions', countKey: 'deletion' },
]

const SORT_OPTIONS = [
  { key: 'DESC', label: 'Newest first' },
  { key: 'ASC', label: 'Oldest first' },
] as const

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i

const attachmentName = (url: string): string => {
  try {
    const pathname = new URL(url).pathname
    return decodeURIComponent(pathname.split('/').pop() || url)
  } catch {
    return url
  }
}

const ImageLightbox = ({
  images,
  index,
  onClose,
  onNavigate,
}: {
  images: string[]
  index: number | null
  onClose: () => void
  onNavigate: (index: number) => void
}) => {
  const [isZoomed, setIsZoomed] = useState(false)

  const isOpened = index !== null
  const url = isOpened ? images[index] : null

  useEffect(() => {
    setIsZoomed(false)
  }, [index])

  useEffect(() => {
    if (!isOpened) {
      return undefined
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && index > 0) {
        onNavigate(index - 1)
      } else if (event.key === 'ArrowRight' && index < images.length - 1) {
        onNavigate(index + 1)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpened, index, images.length, onNavigate])

  return (
    <Dialog className='relative z-40' open={isOpened} onClose={onClose}>
      <DialogBackdrop
        transition
        className='fixed inset-0 bg-black/85 backdrop-blur-[2px] transition-opacity duration-200 ease-out-quint data-closed:opacity-0 data-leave:duration-150'
      />

      <div className='fixed inset-0 z-10 flex flex-col'>
        <DialogPanel
          transition
          className='flex min-h-0 flex-1 flex-col transition-[opacity,transform] duration-200 ease-out-quint data-closed:scale-[0.98] data-closed:opacity-0 data-leave:duration-150'
        >
          {index !== null && url ? (
            <>
              <div className='flex shrink-0 items-center justify-between gap-4 px-4 py-3'>
                <span className='truncate text-sm text-gray-300'>
                  {attachmentName(url)}
                  {images.length > 1 ? (
                    <span className='ml-2 text-gray-500 tabular-nums'>
                      {index + 1} / {images.length}
                    </span>
                  ) : null}
                </span>
                <div className='flex shrink-0 items-center gap-1'>
                  <a
                    href={url}
                    target='_blank'
                    rel='noopener noreferrer'
                    aria-label='Open original in a new tab'
                    className='rounded-md p-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white'
                  >
                    <ArrowSquareOutIcon className='size-5' />
                  </a>
                  <button
                    type='button'
                    onClick={onClose}
                    aria-label='Close'
                    className='rounded-md p-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white'
                  >
                    <XIcon className='size-5' />
                  </button>
                </div>
              </div>

              <div
                role='presentation'
                className={cn(
                  'min-h-0 flex-1 overflow-auto',
                  !isZoomed && 'flex items-center justify-center p-4 pt-0',
                )}
                onClick={(event) => {
                  if (event.target === event.currentTarget) {
                    onClose()
                  }
                }}
              >
                <button
                  type='button'
                  aria-label={isZoomed ? 'Zoom out' : 'Zoom in'}
                  onClick={() => setIsZoomed((prev) => !prev)}
                  className='group contents'
                >
                  <img
                    src={url}
                    alt={attachmentName(url)}
                    className={cn(
                      'group-focus-visible:outline-2 group-focus-visible:outline-indigo-500',
                      isZoomed
                        ? 'mx-auto max-w-none cursor-zoom-out'
                        : 'max-h-full max-w-full cursor-zoom-in object-contain',
                    )}
                  />
                </button>
              </div>

              {index > 0 ? (
                <button
                  type='button'
                  onClick={() => onNavigate(index - 1)}
                  aria-label='Previous image'
                  className='absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-black/50 p-2.5 text-gray-200 transition-colors hover:bg-black/70 hover:text-white'
                >
                  <CaretLeftIcon className='size-6' />
                </button>
              ) : null}
              {index < images.length - 1 ? (
                <button
                  type='button'
                  onClick={() => onNavigate(index + 1)}
                  aria-label='Next image'
                  className='absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-black/50 p-2.5 text-gray-200 transition-colors hover:bg-black/70 hover:text-white'
                >
                  <CaretRightIcon className='size-6' />
                </button>
              ) : null}
            </>
          ) : null}
        </DialogPanel>
      </div>
    </Dialog>
  )
}

const Attachments = ({ urls }: { urls: string[] }) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (urls.length === 0) {
    return null
  }

  const imageUrls = urls.filter((url) => IMAGE_EXTENSIONS.test(url))

  return (
    <div className='mt-3 flex flex-wrap gap-2'>
      {urls.map((url) =>
        IMAGE_EXTENSIONS.test(url) ? (
          <button
            key={url}
            type='button'
            onClick={() => setLightboxIndex(imageUrls.indexOf(url))}
            aria-label={`View ${attachmentName(url)}`}
            className='group relative block cursor-pointer overflow-hidden rounded-md ring-1 ring-gray-200 transition-shadow hover:ring-2 hover:ring-indigo-400 dark:ring-slate-700/80'
          >
            <img
              src={url}
              alt={attachmentName(url)}
              loading='lazy'
              className='h-24 w-auto max-w-48 object-cover'
            />
            <span className='absolute inset-0 hidden items-center justify-center bg-black/40 group-hover:flex'>
              <MagnifyingGlassPlusIcon className='size-5 text-white' />
            </span>
          </button>
        ) : (
          <a
            key={url}
            href={url}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700'
          >
            <FileIcon className='size-4 shrink-0' />
            <span className='max-w-48 truncate'>{attachmentName(url)}</span>
          </a>
        ),
      )}
      <ImageLightbox
        images={imageUrls}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />
    </div>
  )
}

const authorInitial = (item: AdminFeedbackItem): string => {
  const source = item.user?.email || item.email
  return source ? source[0].toUpperCase() : '?'
}

const FeedbackAuthor = ({
  item,
  type,
}: {
  item: AdminFeedbackItem
  type: AdminFeedbackType
}) => {
  if (item.user) {
    return (
      <span className='inline-flex items-center gap-2'>
        <Link
          to={`/admin?tab=users&user=${item.user.id}`}
          className={adminLinkClassName}
        >
          {item.user.email}
        </Link>
        {item.user.planCode && item.user.planCode !== 'none' ? (
          <Badge colour='indigo' label={item.user.planCode} size='sm' />
        ) : null}
      </span>
    )
  }

  // Cancellation rows keep the email even after the account is gone
  if (item.email) {
    return (
      <span className='inline-flex items-center gap-2'>
        <span className='text-sm font-medium text-gray-900 dark:text-gray-100'>
          {item.email}
        </span>
        <Badge colour='slate' label='account deleted' size='sm' />
      </span>
    )
  }

  if (type === 'deletion') {
    return (
      <span className='text-sm font-medium text-gray-500 italic dark:text-gray-400'>
        Deleted account
      </span>
    )
  }

  return (
    <span className='inline-flex items-center gap-2'>
      <span className='text-sm font-medium text-gray-500 italic dark:text-gray-400'>
        Unknown user
      </span>
      <Badge colour='slate' label='account deleted' size='sm' />
    </span>
  )
}

const FeedbackCard = ({
  item,
  type,
}: {
  item: AdminFeedbackItem
  type: AdminFeedbackType
}) => (
  <div className='rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/25'>
    <div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-1'>
      <div className='flex min-w-0 items-center gap-3'>
        <span
          aria-hidden='true'
          className='flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
        >
          {authorInitial(item)}
        </span>
        <div className='min-w-0'>
          <FeedbackAuthor item={item} type={type} />
          {type === 'cancellation' && item.planCode ? (
            <Text as='p' size='xs' colour='secondary'>
              was on {item.planCode}
            </Text>
          ) : null}
        </div>
      </div>
      <Tooltip
        text={dayjs(item.createdAt).format('MMM D, YYYY HH:mm')}
        tooltipNode={
          <Text
            as='span'
            size='xs'
            colour='secondary'
            className='whitespace-nowrap'
          >
            {dayjs(item.createdAt).fromNow()}
          </Text>
        }
      />
    </div>

    <div className='mt-3'>
      {item.message ? (
        <Text
          as='p'
          size='sm'
          className='leading-relaxed break-words whitespace-pre-wrap'
        >
          {item.message}
        </Text>
      ) : (
        <Text as='p' size='sm' colour='secondary' className='italic'>
          No message left
        </Text>
      )}
    </div>

    <Attachments urls={item.attachmentUrls || []} />
  </div>
)

interface FeedbackTabProps {
  feedback: AdminFeedbackList
  type: AdminFeedbackType
  page: number
  search: string
  order: 'ASC' | 'DESC'
  onTypeChange: (type: AdminFeedbackType) => void
  onPageChange: (page: number) => void
  onSearchChange: (search: string) => void
  onOrderChange: (order: 'ASC' | 'DESC') => void
}

export const FeedbackTab = ({
  feedback,
  type,
  page,
  search,
  order,
  onTypeChange,
  onPageChange,
  onSearchChange,
  onOrderChange,
}: FeedbackTabProps) => {
  const selectedSort =
    SORT_OPTIONS.find(({ key }) => key === order) || SORT_OPTIONS[0]

  const searchPlaceholder =
    type === 'user'
      ? 'Search by message or author email'
      : type === 'cancellation'
        ? 'Search by message, email or plan'
        : 'Search by message'

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex w-fit max-w-full overflow-x-auto rounded-md border border-gray-200 p-0.5 dark:border-slate-800/60'>
        {FEEDBACK_TYPES.map(({ key, label, countKey }) => (
          <button
            key={key}
            type='button'
            onClick={() => onTypeChange(key)}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
              type === key
                ? 'bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-gray-50'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50',
            )}
          >
            {label}
            <span
              className={cn(
                'rounded-full px-1.5 text-xs tabular-nums',
                type === key
                  ? 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-gray-200'
                  : 'bg-gray-100 text-gray-500 dark:bg-slate-800/80 dark:text-gray-400',
              )}
            >
              {nLocaleFormatter(feedback.counts[countKey])}
            </span>
          </button>
        ))}
      </div>

      <div className='flex flex-col gap-3 sm:flex-row sm:items-end'>
        <Input
          label='Search feedback'
          className='sm:max-w-xs sm:flex-1'
          leadingIcon={<MagnifyingGlassIcon className='size-4 text-gray-400' />}
          placeholder={searchPlaceholder}
          defaultValue={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <Select
          label='Sort'
          fieldLabelClassName='sr-only'
          title={selectedSort.label}
          items={SORT_OPTIONS}
          labelExtractor={(item) => item.label}
          keyExtractor={(item) => item.key}
          selectedItem={selectedSort}
          onSelect={(item) => onOrderChange(item.key)}
          menuClassName='w-max min-w-full'
        />
      </div>

      {feedback.items.length === 0 ? (
        <EmptyState
          message={
            search ? 'No feedback matches your search' : 'No feedback here yet'
          }
        />
      ) : (
        <>
          <div className='flex flex-col gap-3'>
            {feedback.items.map((item) => (
              <FeedbackCard key={item.id} item={item} type={type} />
            ))}
          </div>
          {feedback.total > feedback.pageSize ? (
            <Pagination
              page={page + 1}
              setPage={(newPage) => onPageChange(newPage - 1)}
              pageAmount={Math.ceil(feedback.total / feedback.pageSize)}
              total={feedback.total}
              pageSize={feedback.pageSize}
            />
          ) : null}
        </>
      )}
    </div>
  )
}
