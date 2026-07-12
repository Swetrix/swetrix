import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import {
  SlidersHorizontalIcon,
  TrashIcon,
  FunnelIcon,
  FileTextIcon,
  CursorClickIcon,
  ArrowRightIcon,
  CaretDownIcon,
} from '@phosphor-icons/react'
import { useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import type { AnalyticsFunnel, Funnel } from '~/lib/models/Project'
import { FunnelChart } from '~/pages/Project/tabs/Funnels/FunnelChart'
import {
  ChartSkeleton,
  RefetchIndicator,
} from '~/pages/Project/View/v2/loading'
import { useAuth } from '~/providers/AuthProvider'
import Button from '~/ui/Button'
import { Text } from '~/ui/Text'
import { nLocaleFormatter } from '~/utils/generic'

export interface FunnelData {
  funnel: AnalyticsFunnel[]
  totalPageviews: number
}

interface FunnelsListProps {
  funnels?: Funnel[]
  activeFunnelId: string | null
  funnelData: FunnelData | null
  funnelDataLoading: boolean
  funnelDataRefetching: boolean
  onToggleFunnel: (id: string) => void
  onBarClick: (stepIndex: number) => void
  openFunnelSettings: (funnel?: Funnel) => void
  deleteFunnel: (id: string) => void
  loading: boolean
  allowedToManage: boolean
}

interface FunnelCardProps {
  funnel: Funnel
  isExpanded: boolean
  funnelData: FunnelData | null
  funnelDataLoading: boolean
  funnelDataRefetching: boolean
  onToggleFunnel: (id: string) => void
  onBarClick: (stepIndex: number) => void
  openFunnelSettings: (funnel: Funnel) => void
  deleteFunnel: (id: string) => void
  loading: boolean
  allowedToManage: boolean
}

interface AddFunnelProps {
  openFunnelSettings: (funnel?: Funnel) => void
}

const STEPS_MAX_HEIGHT = 42

const getFunnelSummary = (funnelData?: FunnelData | null) => {
  if (!funnelData || _isEmpty(funnelData.funnel)) {
    return null
  }

  const stepsCount = funnelData.funnel.length
  const startVisitors = funnelData.funnel[0]?.events || 0
  const endVisitors = funnelData.funnel[stepsCount - 1]?.events || 0
  const conversionRate = Number(
    ((endVisitors / Math.max(startVisitors, 1)) * 100).toFixed(2),
  )

  return {
    stepsCount,
    startVisitors,
    endVisitors,
    conversionRate,
  }
}

const FunnelSteps = ({ steps }: { steps: string[] }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={containerRef}
      style={{ maxHeight: STEPS_MAX_HEIGHT }}
      className='mt-2.5 flex flex-wrap items-center gap-1 overflow-hidden'
    >
      {_map(steps, (step, index) => {
        const isPage = step.startsWith('/')

        return (
          <div key={index} className='contents'>
            {index > 0 && (
              <ArrowRightIcon
                weight='bold'
                className='size-2.5 shrink-0 text-gray-600 dark:text-slate-300'
              />
            )}
            <Text
              as='span'
              size='xxs'
              weight='medium'
              colour='secondary'
              code
              className='flex items-center gap-1'
            >
              {isPage ? (
                <FileTextIcon weight='duotone' className='size-3 shrink-0' />
              ) : (
                <CursorClickIcon
                  weight='duotone'
                  className='size-3 shrink-0 text-lime-500 dark:text-lime-400'
                />
              )}
              {step}
            </Text>
          </div>
        )
      })}
    </div>
  )
}

const FunnelExpandedChart = ({
  funnelData,
  onBarClick,
}: {
  funnelData: FunnelData | null
  onBarClick: (stepIndex: number) => void
}) => {
  const { t } = useTranslation('common')
  const funnelSummary = useMemo(
    () => getFunnelSummary(funnelData),
    [funnelData],
  )

  if (!funnelData?.funnel || _isEmpty(funnelData.funnel)) {
    return (
      <div className='flex h-[260px] items-center justify-center'>
        <Text as='p' colour='muted'>
          {t('project.noData')}
        </Text>
      </div>
    )
  }

  return (
    <>
      {funnelSummary ? (
        <div>
          <Text as='p' weight='medium' className='lg:text-left'>
            {t('project.funnelSummary.xStepFunnel', {
              x: funnelSummary.stepsCount,
            })}
            <span className='mx-2 text-gray-400'>•</span>
            {t('project.funnelSummary.conversionRateShort', {
              x: funnelSummary.conversionRate,
            })}
          </Text>
          <Text as='p' className='text-center lg:text-left'>
            {t('project.funnelSummary.startShort')}:{' '}
            {nLocaleFormatter(funnelSummary.startVisitors)}
            <span className='mx-1'>→</span>
            {t('project.funnelSummary.endShort')}:{' '}
            {nLocaleFormatter(funnelSummary.endVisitors)}
          </Text>
        </div>
      ) : null}
      <FunnelChart
        funnel={funnelData.funnel}
        totalPageviews={funnelData.totalPageviews}
        t={t}
        className='mt-5 h-80 [&_svg]:!overflow-visible'
        onBarClick={onBarClick}
      />
    </>
  )
}

const FunnelCard = ({
  funnel,
  isExpanded,
  funnelData,
  funnelDataLoading,
  funnelDataRefetching,
  onToggleFunnel,
  onBarClick,
  openFunnelSettings,
  deleteFunnel,
  loading,
  allowedToManage,
}: FunnelCardProps) => {
  const { t } = useTranslation()

  return (
    <li className='relative mb-3 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition-colors dark:border-slate-800/60 dark:bg-slate-900/25'>
      {isExpanded && funnelDataRefetching ? <RefetchIndicator /> : null}
      <div className='flex transition-colors hover:bg-gray-200/70 dark:hover:bg-slate-900/60'>
        <button
          type='button'
          aria-expanded={isExpanded}
          aria-controls={`funnel-${funnel.id}-details`}
          onClick={() => onToggleFunnel(funnel.id)}
          className='flex min-w-0 flex-1 cursor-pointer justify-between gap-x-6 px-4 py-4 text-left focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-hidden focus-visible:ring-inset sm:px-6 sm:pr-2 dark:focus-visible:ring-slate-300'
        >
          <div className='min-w-0 flex-auto'>
            <Text
              as='p'
              weight='semibold'
              truncate
              className='flex items-center gap-x-1.5'
            >
              <FunnelIcon className='size-4 text-teal-500' />
              <span>{funnel.name}</span>
            </Text>
            {funnel.steps?.length > 0 && <FunnelSteps steps={funnel.steps} />}
          </div>
          <div className='flex shrink-0 items-center gap-x-4'>
            <CaretDownIcon
              className={cx(
                'size-5 text-gray-500 transition-transform dark:text-gray-400',
                {
                  'rotate-180': isExpanded,
                },
              )}
            />
          </div>
        </button>
        <div className='flex shrink-0 items-center gap-1 py-4 pr-4 sm:pr-6'>
          <Button
            variant='icon'
            type='button'
            onClick={() => openFunnelSettings(funnel)}
            aria-label={t('common.settings')}
            className='p-1.5 text-gray-800 dark:text-slate-400 dark:hover:text-slate-300'
          >
            <SlidersHorizontalIcon className='size-4' />
          </Button>
          {allowedToManage ? (
            <Button
              variant='icon'
              type='button'
              disabled={loading}
              aria-disabled={loading}
              onClick={() => {
                if (!loading) {
                  deleteFunnel(funnel.id)
                }
              }}
              aria-label={t('common.delete')}
              className={cx(
                'p-1.5 text-gray-800 dark:text-slate-400 dark:hover:text-slate-300',
                {
                  'cursor-not-allowed': loading,
                },
              )}
            >
              <TrashIcon className='size-4' />
            </Button>
          ) : null}
        </div>
      </div>
      {isExpanded ? (
        <div
          id={`funnel-${funnel.id}-details`}
          className='border-t border-gray-200 px-4 py-4 sm:px-6 dark:border-slate-700'
        >
          {funnelDataLoading ? (
            <ChartSkeleton className='h-80 md:h-80' />
          ) : (
            <FunnelExpandedChart
              funnelData={funnelData}
              onBarClick={onBarClick}
            />
          )}
        </div>
      ) : null}
    </li>
  )
}

const AddFunnel = ({ openFunnelSettings }: AddFunnelProps) => {
  const { t } = useTranslation()

  const onClick = () => {
    openFunnelSettings()
  }

  return (
    <li className='mb-3'>
      <button
        type='button'
        onClick={onClick}
        className='group flex min-h-[96px] w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-gray-300 transition-colors hover:border-gray-400 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-hidden dark:border-gray-500 dark:hover:border-gray-600 dark:focus-visible:ring-slate-300 dark:focus-visible:ring-offset-slate-950'
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
      </button>
    </li>
  )
}

const FunnelsList = ({
  funnels,
  activeFunnelId,
  funnelData,
  funnelDataLoading,
  funnelDataRefetching,
  onToggleFunnel,
  onBarClick,
  openFunnelSettings,
  deleteFunnel,
  loading,
  allowedToManage,
}: FunnelsListProps) => {
  const { isAuthenticated } = useAuth()

  return (
    <ul className='mt-4'>
      {_map(funnels, (funnel) => (
        <FunnelCard
          key={funnel.id}
          funnel={funnel}
          isExpanded={activeFunnelId === funnel.id}
          funnelData={funnelData}
          funnelDataLoading={funnelDataLoading}
          funnelDataRefetching={funnelDataRefetching}
          onToggleFunnel={onToggleFunnel}
          onBarClick={onBarClick}
          deleteFunnel={deleteFunnel}
          openFunnelSettings={openFunnelSettings}
          loading={loading}
          allowedToManage={allowedToManage}
        />
      ))}
      {isAuthenticated && allowedToManage ? (
        <AddFunnel openFunnelSettings={openFunnelSettings} />
      ) : null}
    </ul>
  )
}

export default FunnelsList
