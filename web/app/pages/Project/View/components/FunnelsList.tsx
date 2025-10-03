import cx from 'clsx'
import _map from 'lodash/map'
import { Settings2Icon, Trash2Icon, CirclePlusIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'

import { Funnel } from '~/lib/models/Project'
import { useAuth } from '~/providers/AuthProvider'

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

const FunnelCard = ({ funnel, openFunnelSettings, deleteFunnel, loading, allowedToManage }: FunnelCardProps) => {
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
      className='min-h-[120px] cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-slate-800/25 dark:bg-slate-800/70 dark:hover:bg-slate-700/60'
    >
      <div className='px-4 py-4'>
        <div className='flex items-center justify-between'>
          <p className='truncate text-base font-semibold text-slate-900 dark:text-gray-50'>{funnel.name}</p>
          <div className='flex items-center gap-1'>
            <button
              type='button'
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                openFunnelSettings(funnel)
              }}
              aria-label={t('common.settings')}
              className='rounded-md p-1.5 text-gray-800 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-300'
            >
              <Settings2Icon className='size-5' strokeWidth={1.5} />
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
                  'rounded-md p-1.5 text-gray-800 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-300',
                  {
                    'cursor-not-allowed': loading,
                  },
                )}
              >
                <Trash2Icon className='size-5' strokeWidth={1.5} />
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
      className='group flex h-auto min-h-[120px] cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 dark:border-gray-500 dark:hover:border-gray-600'
    >
      <div>
        <CirclePlusIcon
          className='mx-auto h-12 w-12 text-gray-400 group-hover:text-gray-500 dark:text-gray-200 group-hover:dark:text-gray-400'
          strokeWidth={1.5}
        />
        <span className='mt-2 block text-sm font-semibold text-gray-900 dark:text-gray-50 group-hover:dark:text-gray-400'>
          {t('dashboard.newFunnel')}
        </span>
      </div>
    </li>
  )
}

const FunnelsList = ({ funnels, openFunnelSettings, deleteFunnel, loading, allowedToManage }: FunnelsListProps) => {
  const { isAuthenticated } = useAuth()

  return (
    <div role='list' className='mt-4 grid grid-cols-1 gap-x-6 gap-y-3 lg:grid-cols-3 lg:gap-y-6'>
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
      {isAuthenticated && allowedToManage ? <AddFunnel openFunnelSettings={openFunnelSettings} /> : null}
    </div>
  )
}

export default FunnelsList
