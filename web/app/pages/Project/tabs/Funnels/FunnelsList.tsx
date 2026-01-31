import cx from 'clsx'
import _map from 'lodash/map'
import {
  SlidersHorizontalIcon,
  TrashIcon,
  FunnelIcon,
} from '@phosphor-icons/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'

import { Funnel } from '~/lib/models/Project'
import { useAuth } from '~/providers/AuthProvider'
import { Text } from '~/ui/Text'

interface FunnelsListProps {
  funnels?: any[]
  openFunnelSettings: (funnel?: Funnel) => void
  deleteFunnel: (id: string) => void
  loading: boolean
  allowedToManage: boolean
}

interface FunnelCardProps {
  funnel: Funnel
  openFunnelSettings: (funnel: Funnel) => void
  deleteFunnel: (id: string) => void
  loading: boolean
  allowedToManage: boolean
}

interface AddFunnelProps {
  openFunnelSettings: (funnel?: Funnel) => void
}

const FunnelCard = ({
  funnel,
  openFunnelSettings,
  deleteFunnel,
  loading,
  allowedToManage,
}: FunnelCardProps) => {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()

  const search = useMemo(() => {
    const params = new URLSearchParams(searchParams)
    params.set('funnelId', funnel.id)
    return params.toString()
  }, [funnel.id, searchParams])

  return (
    <Link
      to={{
        search,
      }}
      className='min-h-[120px] cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition-colors hover:bg-gray-200/70 dark:border-slate-800/60 dark:bg-slate-800/25 dark:hover:bg-slate-800/60'
    >
      <div className='px-4 py-4'>
        <div className='flex items-center justify-between'>
          <Text as='p' size='base' weight='semibold' truncate>
            {funnel.name}
          </Text>
          <div className='flex items-center gap-1'>
            <button
              type='button'
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                openFunnelSettings(funnel)
              }}
              aria-label={t('common.settings')}
              className='rounded-md border border-transparent p-1.5 text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 dark:hover:text-slate-300'
            >
              <SlidersHorizontalIcon className='size-5' />
            </button>
            {allowedToManage ? (
              <button
                type='button'
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  deleteFunnel(funnel.id)
                }}
                aria-label={t('common.delete')}
                className={cx(
                  'rounded-md border border-transparent p-1.5 text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 dark:hover:text-slate-300',
                  {
                    'cursor-not-allowed': loading,
                  },
                )}
              >
                <TrashIcon className='size-5' />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  )
}

const AddFunnel = ({ openFunnelSettings }: AddFunnelProps) => {
  const { t } = useTranslation()

  const onClick = () => {
    openFunnelSettings()
  }

  return (
    <li
      onClick={onClick}
      className='group flex h-auto min-h-[120px] cursor-pointer items-center justify-center rounded-lg border border-dashed border-gray-300 transition-colors hover:border-gray-400 dark:border-gray-500 dark:hover:border-gray-600'
    >
      <div>
        <FunnelIcon className='mx-auto h-12 w-12 text-gray-400 transition-colors group-hover:text-gray-500 dark:text-gray-200 group-hover:dark:text-gray-400' />
        <Text
          as='span'
          size='sm'
          weight='semibold'
          className='mt-2 block group-hover:dark:text-gray-400'
        >
          {t('dashboard.newFunnel')}
        </Text>
      </div>
    </li>
  )
}

const FunnelsList = ({
  funnels,
  openFunnelSettings,
  deleteFunnel,
  loading,
  allowedToManage,
}: FunnelsListProps) => {
  const { isAuthenticated } = useAuth()

  return (
    <div role='list' className='grid grid-cols-1 gap-3 lg:grid-cols-3'>
      {_map(funnels, (funnel) => (
        <FunnelCard
          key={funnel.id}
          funnel={funnel}
          deleteFunnel={deleteFunnel}
          openFunnelSettings={openFunnelSettings}
          loading={loading}
          allowedToManage={allowedToManage}
        />
      ))}
      {isAuthenticated && allowedToManage ? (
        <AddFunnel openFunnelSettings={openFunnelSettings} />
      ) : null}
    </div>
  )
}

export default FunnelsList
