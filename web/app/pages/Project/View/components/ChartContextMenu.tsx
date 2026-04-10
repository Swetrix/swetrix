import cx from 'clsx'
import {
  PencilIcon,
  PlusIcon,
  TrashIcon,
  UsersIcon,
} from '@phosphor-icons/react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Annotation } from '~/lib/models/Project'

interface ChartContextMenuProps {
  x: number
  y: number
  isOpen: boolean
  onClose: () => void
  onAddAnnotation: () => void
  onEditAnnotation?: () => void
  onDeleteAnnotation?: () => void
  onExploreSessions?: () => void
  existingAnnotation?: Annotation | null
  allowedToManage: boolean
}

export const ChartContextMenu = ({
  x,
  y,
  isOpen,
  onClose,
  onAddAnnotation,
  onEditAnnotation,
  onDeleteAnnotation,
  onExploreSessions,
  existingAnnotation,
  allowedToManage,
}: ChartContextMenuProps) => {
  const { t } = useTranslation('common')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    // Add a small delay to avoid the event that opened the menu from immediately closing it
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('contextmenu', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }, 10)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('contextmenu', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  const annotationItems = allowedToManage
    ? existingAnnotation
      ? [
          {
            label: t('project.editAnnotation'),
            icon: PencilIcon,
            onClick: onEditAnnotation,
          },
          {
            label: t('project.deleteAnnotation'),
            icon: TrashIcon,
            onClick: onDeleteAnnotation,
            danger: true,
          },
        ]
      : [
          {
            label: t('project.addAnnotation'),
            icon: PlusIcon,
            onClick: onAddAnnotation,
          },
        ]
    : []

  return (
    <div
      ref={menuRef}
      className='fixed z-[9999] min-w-[160px] rounded-md border border-gray-200 bg-white py-1 shadow-md dark:border-slate-700 dark:bg-slate-900'
      style={{
        left: x,
        top: y,
      }}
    >
      {onExploreSessions ? (
        <>
          <button
            type='button'
            onClick={() => {
              onExploreSessions()
              onClose()
            }}
            className='flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-800'
          >
            <UsersIcon className='h-4 w-4' />
            {t('project.exploreSessions')}
          </button>
          {annotationItems.length > 0 ? (
            <div className='my-1 border-t border-gray-200 dark:border-slate-700' />
          ) : null}
        </>
      ) : null}
      {!allowedToManage && !onExploreSessions ? (
        <div className='px-3 py-2 text-sm text-gray-500 dark:text-gray-400'>
          {t('project.annotationsViewOnly')}
        </div>
      ) : null}
      {annotationItems.map((item) => (
        <button
          key={item.label}
          type='button'
          onClick={() => {
            item.onClick?.()
            onClose()
          }}
          className={cx(
            'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
            item.danger
              ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-800',
          )}
        >
          <item.icon className='h-4 w-4' />
          {item.label}
        </button>
      ))}
    </div>
  )
}
