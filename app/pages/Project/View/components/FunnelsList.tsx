import React from 'react'
import _map from 'lodash/map'
import cx from 'clsx'
import { useTranslation } from 'react-i18next'
import { AdjustmentsVerticalIcon, PlusCircleIcon, TrashIcon } from '@heroicons/react/24/outline'
import { IFunnel } from 'redux/models/IProject'

interface IFunnelsList {
  funnels?: any[]
  openFunnelSettings: (funnel?: IFunnel) => void
  openFunnel: (funnel: IFunnel) => void
  deleteFunnel: (id: string) => void
  loading: boolean
  authenticated: boolean
  allowedToManage: boolean
}

interface IFunnelCard {
  funnel: IFunnel
  openFunnelSettings: (funnel: IFunnel) => void
  openFunnel: (funnel: IFunnel) => void
  deleteFunnel: (id: string) => void
  loading: boolean
  allowedToManage: boolean
}

interface IAddFunnel {
  openFunnelSettings: (funnel?: IFunnel) => void
}

const FunnelCard = ({
  funnel,
  openFunnelSettings,
  openFunnel,
  deleteFunnel,
  loading,
  allowedToManage,
}: IFunnelCard): JSX.Element => {
  const { t } = useTranslation()

  return (
    <li
      onClick={() => openFunnel(funnel)}
      className='overflow-hidden min-h-[120px] rounded-xl border border-gray-200 cursor-pointer bg-gray-50 hover:bg-gray-100 dark:bg-[#162032] dark:hover:bg-slate-800 dark:border-slate-800/25'
    >
      <div className='py-4 px-4'>
        <div className='flex justify-between items-center'>
          <p className='text-lg font-semibold text-slate-900 dark:text-gray-50 truncate'>{funnel.name}</p>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation()
                openFunnelSettings(funnel)
              }}
              aria-label={t('common.settings')}
            >
              <AdjustmentsVerticalIcon className='w-6 h-6 text-gray-800 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-500' />
            </button>
            {allowedToManage && (
              <TrashIcon
                onClick={(e) => {
                  e.stopPropagation()
                  deleteFunnel(funnel.id)
                }}
                role='button'
                aria-label={t('common.delete')}
                className={cx(
                  'w-6 h-6 text-gray-800 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-500',
                  {
                    'cursor-not-allowed': loading,
                  },
                )}
              />
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

const AddFunnel = ({ openFunnelSettings }: IAddFunnel): JSX.Element => {
  const { t } = useTranslation()

  const onClick = () => {
    openFunnelSettings()
  }

  return (
    <li
      onClick={onClick}
      className='flex cursor-pointer justify-center items-center rounded-lg border-2 border-dashed h-auto min-h-[120px] group border-gray-300 hover:border-gray-400 dark:border-gray-500 dark:hover:border-gray-600'
    >
      <div>
        <PlusCircleIcon className='mx-auto h-12 w-12 text-gray-400 dark:text-gray-200 group-hover:text-gray-500 group-hover:dark:text-gray-400' />
        <span className='mt-2 block text-sm font-semibold text-gray-900 dark:text-gray-50 group-hover:dark:text-gray-400'>
          {t('dashboard.newFunnel')}
        </span>
      </div>
    </li>
  )
}

/**
 * Component to render a list of funnels.
 *
 * @param {string} name - Row name to override country name with.
 * @returns {JSX.Element}
 */
const FunnelsList = ({
  funnels,
  openFunnelSettings,
  openFunnel,
  deleteFunnel,
  loading,
  authenticated,
  allowedToManage,
}: IFunnelsList): JSX.Element => (
  <ul className='grid grid-cols-1 gap-x-6 gap-y-3 lg:gap-y-6 lg:grid-cols-3 mt-4'>
    {_map(funnels, (funnel) => (
      <FunnelCard
        key={funnel.id}
        funnel={funnel}
        deleteFunnel={deleteFunnel}
        openFunnelSettings={openFunnelSettings}
        openFunnel={openFunnel}
        loading={loading}
        allowedToManage={allowedToManage}
      />
    ))}
    {authenticated && allowedToManage && <AddFunnel openFunnelSettings={openFunnelSettings} />}
  </ul>
)

export default FunnelsList
