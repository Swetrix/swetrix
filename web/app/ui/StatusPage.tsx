import { CheckCircleIcon, XCircleIcon, InfoIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '~/ui/Link'

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
      className='size-6 text-emerald-600 dark:text-emerald-400'
      weight='duotone'
      aria-hidden='true'
    />
  ),
  error: (
    <XCircleIcon
      className='size-6 text-red-600 dark:text-red-400'
      weight='duotone'
      aria-hidden='true'
    />
  ),
  info: (
    <InfoIcon
      className='size-6 text-amber-600 dark:text-amber-400'
      weight='duotone'
      aria-hidden='true'
    />
  ),
}

const iconBgMap: Record<StatusType, string> = {
  success: 'bg-emerald-100/70 dark:bg-emerald-500/10',
  error: 'bg-red-100/70 dark:bg-red-500/10',
  info: 'bg-amber-100/70 dark:bg-amber-500/10',
}

const baseActionClasses =
  'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden'

const primaryActionClasses =
  'bg-slate-900 text-white shadow-xs hover:bg-slate-700 focus-visible:ring-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white dark:focus-visible:ring-slate-300 dark:focus-visible:ring-offset-slate-950'

const secondaryActionClasses =
  'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:ring-slate-900 dark:bg-slate-900 dark:text-gray-200 dark:ring-slate-700/80 dark:hover:bg-slate-800 dark:focus-visible:ring-slate-300 dark:focus-visible:ring-offset-slate-950'

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
        <div
          className='flex flex-col items-center'
          role='status'
          aria-live='polite'
        >
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
            'mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl',
            iconBgMap[type],
          )}
        >
          {displayIcon}
        </div>

        {title ? (
          <Text
            as='h1'
            size='xl'
            weight='semibold'
            className='tracking-tight text-balance'
          >
            {title}
          </Text>
        ) : null}

        {description ? (
          <Text
            as='p'
            size='base'
            colour='secondary'
            className='mt-2 text-pretty'
          >
            {description}
          </Text>
        ) : null}

        {actions && actions.length > 0 ? (
          <div className='mt-6 flex flex-wrap items-center justify-center gap-2.5'>
            {actions.map((action, index) =>
              isActionLink(action) ? (
                <Link
                  key={action.to}
                  to={action.to}
                  className={cn(
                    baseActionClasses,
                    action.primary
                      ? primaryActionClasses
                      : secondaryActionClasses,
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
                    baseActionClasses,
                    action.primary
                      ? primaryActionClasses
                      : secondaryActionClasses,
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
