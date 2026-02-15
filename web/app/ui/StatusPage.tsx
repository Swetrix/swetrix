import { CheckCircleIcon, XCircleIcon, InfoIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { cn } from '~/utils/generic'

import Spin from './icons/Spin'
import { Text } from './Text'

type StatusType = 'success' | 'error' | 'info'

interface ActionLink {
  label: string
  to: string
  primary?: boolean
}

interface ActionButton {
  label: string
  onClick: () => void
  primary?: boolean
}

type Action = ActionLink | ActionButton

const isActionLink = (action: Action): action is ActionLink => 'to' in action

interface StatusPageProps {
  loading?: boolean
  type?: StatusType
  title?: string
  description?: string
  icon?: ReactNode
  actions?: Action[]
}

const iconMap: Record<StatusType, ReactNode> = {
  success: (
    <CheckCircleIcon
      className='size-8 text-green-500 dark:text-green-400'
      aria-hidden='true'
    />
  ),
  error: (
    <XCircleIcon
      className='size-8 text-red-500 dark:text-red-400'
      aria-hidden='true'
    />
  ),
  info: (
    <InfoIcon
      className='size-8 text-amber-500 dark:text-amber-400'
      aria-hidden='true'
    />
  ),
}

const iconBgMap: Record<StatusType, string> = {
  success: 'bg-green-100 dark:bg-green-500/10',
  error: 'bg-red-100 dark:bg-red-500/10',
  info: 'bg-amber-100 dark:bg-amber-500/10',
}

const StatusPage = ({
  loading,
  type = 'success',
  title,
  description,
  icon,
  actions,
}: StatusPageProps) => {
  const { t } = useTranslation('common')

  if (loading) {
    return (
      <div className='flex min-h-page items-center justify-center bg-gray-50 dark:bg-slate-950'>
        <div className='flex flex-col items-center'>
          <Spin />
          <span className='sr-only'>{t('common.loading')}</span>
        </div>
      </div>
    )
  }

  const displayIcon = icon ?? iconMap[type]

  return (
    <div className='flex min-h-page items-center justify-center bg-gray-50 px-4 dark:bg-slate-950'>
      <div className='mx-auto w-full max-w-md text-center'>
        <div
          className={cn(
            'mx-auto mb-6 flex size-14 items-center justify-center rounded-xl',
            iconBgMap[type],
          )}
        >
          {displayIcon}
        </div>

        {title ? (
          <Text as='h1' size='xl' weight='semibold' className='tracking-tight'>
            {title}
          </Text>
        ) : null}

        {description ? (
          <Text as='p' size='base' colour='secondary' className='mt-2'>
            {description}
          </Text>
        ) : null}

        {actions && actions.length > 0 ? (
          <div className='mt-6 flex flex-wrap items-center justify-center gap-3'>
            {actions.map((action, index) =>
              isActionLink(action) ? (
                <Link
                  key={action.to}
                  to={action.to}
                  className={cn(
                    'inline-flex items-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none',
                    action.primary
                      ? 'bg-slate-900 text-white hover:bg-slate-700 focus:ring-slate-500 dark:bg-slate-900 dark:hover:bg-slate-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800',
                  )}
                >
                  {action.label}
                </Link>
              ) : (
                <button
                  key={index}
                  type='button'
                  onClick={action.onClick}
                  className={cn(
                    'inline-flex items-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none',
                    action.primary
                      ? 'bg-slate-900 text-white hover:bg-slate-700 focus:ring-slate-500 dark:bg-slate-900 dark:hover:bg-slate-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800',
                  )}
                >
                  {action.label}
                </button>
              ),
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default StatusPage
