import NumberFlow, { NumberFlowGroup } from '@number-flow/react'
import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import _isNumber from 'lodash/isNumber'
import _map from 'lodash/map'
import _round from 'lodash/round'
import { motion, type Variants } from 'motion/react'
import React, { memo, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  FLOW_TIMING,
  FLOW_VALUE_CLASS,
  useFlowValue,
} from '~/hooks/useFlowValue'
import { OverallObject, OverallPerformanceObject } from '~/lib/models/Project'
import { Badge } from '~/ui/Badge'
import { Text } from '~/ui/Text'
import {
  nFormatter,
  nFormatterSeparated,
  getStringFromTime,
  getTimeFromSeconds,
} from '~/utils/generic'

const useIsHydrated = () => {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  return isHydrated
}

const StaticCompactNumber = ({ value }: { value: number }) => {
  const [num, symbol] = nFormatterSeparated(value, 1) as [number, string | null]

  return (
    <>
      {num}
      {symbol}
    </>
  )
}

const AnimatedCompactNumber = ({ value }: { value: number }) => {
  const flowValue = useFlowValue(value)
  const [num, symbol] = nFormatterSeparated(flowValue, 1) as [
    number,
    string | null,
  ]

  return (
    <NumberFlow
      className={FLOW_VALUE_CLASS}
      {...FLOW_TIMING}
      value={num}
      suffix={symbol ?? undefined}
      format={{ maximumFractionDigits: 1 }}
      willChange
    />
  )
}

const CompactNumberFlow = ({ value }: { value: number }) => {
  const isHydrated = useIsHydrated()

  return isHydrated ? (
    <AnimatedCompactNumber value={value} />
  ) : (
    <StaticCompactNumber value={value} />
  )
}

const AnimatedPercent = ({ value }: { value: number }) => {
  const flowValue = useFlowValue(value)

  return (
    <NumberFlow
      className={FLOW_VALUE_CLASS}
      {...FLOW_TIMING}
      value={flowValue}
      suffix='%'
      format={{ maximumFractionDigits: 1 }}
      willChange
    />
  )
}

const PercentFlow = ({ value }: { value: number }) => {
  const isHydrated = useIsHydrated()

  return isHydrated ? (
    <AnimatedPercent value={value} />
  ) : (
    <>{_round(value, 1)}%</>
  )
}

const StaticDuration = ({
  value,
  showMs,
}: {
  value?: number
  showMs?: boolean
}) => (
  <>
    {getStringFromTime(
      getTimeFromSeconds(Number.isFinite(value) ? value : 0),
      showMs,
    )}
  </>
)

const AnimatedDuration = ({
  value,
  showMs,
}: {
  value?: number
  showMs?: boolean
}) => {
  const flowValue = useFlowValue(value)
  const time = getTimeFromSeconds(flowValue)
  const s = showMs ? _round(time.s + time.ms / 1000, 2) : time.s

  // Decide which units to render from the target value so the NumberFlow
  // elements mount once and roll from zero, instead of remounting mid-flight
  const target = getTimeFromSeconds(Number.isFinite(value) ? value : 0)
  const targetS = showMs ? _round(target.s + target.ms / 1000, 2) : target.s
  const showH = target.h > 0
  const showM = target.m > 0
  const showS = targetS > 0 || (!showH && !showM)

  return (
    <NumberFlowGroup>
      <>
        {target.negative ? '-' : null}
        {showH ? (
          <NumberFlow
            className={FLOW_VALUE_CLASS}
            {...FLOW_TIMING}
            value={time.h}
            suffix='h'
            willChange
          />
        ) : null}
        {showH && (showM || showS) ? ' ' : null}
        {showM ? (
          <NumberFlow
            className={FLOW_VALUE_CLASS}
            {...FLOW_TIMING}
            value={time.m}
            suffix='m'
            willChange
          />
        ) : null}
        {showM && showS ? ' ' : null}
        {showS ? (
          <NumberFlow
            className={FLOW_VALUE_CLASS}
            {...FLOW_TIMING}
            value={s}
            suffix='s'
            format={{ maximumFractionDigits: 2 }}
            willChange
          />
        ) : null}
      </>
    </NumberFlowGroup>
  )
}

const DurationFlow = ({
  value,
  showMs,
}: {
  value?: number
  showMs?: boolean
}) => {
  const isHydrated = useIsHydrated()

  return isHydrated ? (
    <AnimatedDuration value={value} showMs={showMs} />
  ) : (
    <StaticDuration value={value} showMs={showMs} />
  )
}

// Entrance animation: parent containers set initial='hidden' animate='visible'
// to stagger the cards in. Standalone usage (no motion parent) stays static.
export const metricCardsContainerVariants: Variants = {
  visible: {
    transition: { staggerChildren: 0.04 },
  },
}

const metricCardVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] },
  },
}

interface MetricCardProps {
  label: string
  value: React.ReactNode
  goodChangeDirection?: 'up' | 'down'
  change?: number
  type?: 'percent' | 'string'
  valueMapper?: (value: any, type: 'main' | 'badge') => any
  classes?: {
    container?: string
    value?: string
    label?: string
  }
}

const ChangeBadge = ({
  change,
  type,
  goodChangeDirection,
  valueMapper,
}: Partial<MetricCardProps>) => {
  if (!_isNumber(change)) {
    return null
  }

  if (change === 0) {
    const label = valueMapper
      ? valueMapper(change, 'badge')
      : `0${type === 'percent' ? '%' : ''}`

    return <Badge colour='slate' label={label} />
  }

  if (change < 0 && goodChangeDirection === 'up') {
    const label = valueMapper
      ? valueMapper(change, 'badge')
      : `${change}${type === 'percent' ? '%' : ''}`

    return <Badge colour='green' label={label} />
  }

  if (change < 0 && goodChangeDirection === 'down') {
    const label = valueMapper
      ? valueMapper(change, 'badge')
      : `${change}${type === 'percent' ? '%' : ''}`

    return <Badge colour='slate' label={label} />
  }

  if (change > 0 && goodChangeDirection === 'up') {
    const label = valueMapper
      ? valueMapper(change, 'badge')
      : `${change}${type === 'percent' ? '%' : ''}`

    return <Badge colour='slate' label={label} />
  }

  if (change > 0 && goodChangeDirection === 'down') {
    const label = valueMapper
      ? valueMapper(change, 'badge')
      : `${change}${type === 'percent' ? '%' : ''}`

    return <Badge colour='green' label={label} />
  }
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  change,
  type,
  goodChangeDirection,
  valueMapper,
  classes,
}) => (
  <motion.div
    variants={metricCardVariants}
    className={cx('flex flex-col', classes?.container)}
  >
    <Text
      size='4xl'
      weight='bold'
      className={cx('whitespace-nowrap', classes?.value)}
    >
      {valueMapper ? valueMapper(value, 'main') : value}
    </Text>
    <div
      className={cx(
        'flex items-center whitespace-nowrap',
        {
          'space-x-2': _isNumber(change),
        },
        classes?.label,
      )}
    >
      <Text size='sm' weight='bold'>
        {label}
      </Text>
      <ChangeBadge
        change={change}
        type={type}
        goodChangeDirection={goodChangeDirection}
        valueMapper={valueMapper}
      />
    </div>
  </motion.div>
)

interface MetricCardsProps {
  overall: Partial<OverallObject>
  overallCompare?: Partial<OverallObject>
  activePeriodCompare?: string
}

export const MetricCards = memo(
  ({ overall, overallCompare, activePeriodCompare }: MetricCardsProps) => {
    const { t } = useTranslation('common')

    let uniqueChange = overall.uniqueChange
    let usersChange = overall.usersChange
    let allChange = overall.change
    let bounceRateChange = overall.bounceRateChange
    let sdurChange = overall.sdurChange

    if (!_isEmpty(overallCompare) && activePeriodCompare !== 'previous') {
      uniqueChange =
        (overall.current?.unique as number) -
        (overallCompare?.current?.unique as number)
      usersChange =
        (overall.current?.users as number) -
        (overallCompare?.current?.users as number)
      allChange =
        (overall.current?.all as number) -
        (overallCompare?.current?.all as number)
      bounceRateChange =
        ((overall.current?.bounceRate as number) -
          (overallCompare.current?.bounceRate as number)) *
        -1
      sdurChange =
        (overall.current?.sdur as number) -
        (overallCompare?.current?.sdur as number)
    }

    if (overall.customEVFilterApplied) {
      return (
        <MetricCard
          label={t('project.events')}
          value={overall.current?.all}
          change={allChange}
          type='percent'
          goodChangeDirection='down'
          valueMapper={(value, type) =>
            type === 'badge' ? (
              `${value > 0 ? '+' : ''}${nFormatter(value, 1)}`
            ) : (
              <CompactNumberFlow value={value} />
            )
          }
        />
      )
    }

    return (
      <>
        <MetricCard
          label={t('dashboard.users')}
          value={overall.current?.users}
          change={usersChange}
          type='percent'
          goodChangeDirection='down'
          valueMapper={(value, type) =>
            type === 'badge' ? (
              `${value > 0 ? '+' : ''}${nFormatter(value, 1)}`
            ) : (
              <CompactNumberFlow value={value} />
            )
          }
        />
        <MetricCard
          label={t('dashboard.sessions')}
          value={overall.current?.unique}
          change={uniqueChange}
          type='percent'
          goodChangeDirection='down'
          valueMapper={(value, type) =>
            type === 'badge' ? (
              `${value > 0 ? '+' : ''}${nFormatter(value, 1)}`
            ) : (
              <CompactNumberFlow value={value} />
            )
          }
        />
        <MetricCard
          label={t('dashboard.pageviews')}
          value={overall.current?.all}
          change={allChange}
          type='percent'
          goodChangeDirection='down'
          valueMapper={(value, type) =>
            type === 'badge' ? (
              `${value > 0 ? '+' : ''}${nFormatter(value, 1)}`
            ) : (
              <CompactNumberFlow value={value} />
            )
          }
        />
        <MetricCard
          label={t('dashboard.bounceRate')}
          value={_round(overall.current?.bounceRate as number, 1)}
          change={_round(bounceRateChange as number, 1)}
          type='percent'
          goodChangeDirection='up'
          valueMapper={(value, type) =>
            type === 'badge' ? (
              `${value > 0 ? '+' : ''}${value}%`
            ) : (
              <PercentFlow value={value} />
            )
          }
        />
        <MetricCard
          label={t('dashboard.sessionDuration')}
          value={overall.current?.sdur}
          change={sdurChange}
          goodChangeDirection='down'
          valueMapper={(value, type) =>
            type === 'badge' ? (
              `${value > 0 ? '+' : ''}${getStringFromTime(getTimeFromSeconds(value))}`
            ) : (
              <DurationFlow value={value} />
            )
          }
        />
      </>
    )
  },
)

interface PerformanceMetricCardsProps {
  overall: Partial<OverallPerformanceObject>
  overallCompare?: Partial<OverallPerformanceObject>
}

export const PerformanceMetricCards = memo(
  ({ overall, overallCompare }: PerformanceMetricCardsProps) => {
    const { t } = useTranslation('common')

    let frontendChange = overall.frontendChange
    let backendChange = overall.backendChange
    let networkChange = overall.networkChange

    if (!_isEmpty(overallCompare)) {
      frontendChange =
        (overall.current?.frontend ?? 0) -
        (overallCompare?.current?.frontend ?? 0)
      backendChange =
        (overall.current?.backend ?? 0) -
        (overallCompare?.current?.backend ?? 0)
      networkChange =
        (overall.current?.network ?? 0) -
        (overallCompare?.current?.network ?? 0)
    }

    return (
      <motion.div
        initial='hidden'
        animate='visible'
        variants={metricCardsContainerVariants}
        className='mb-5 flex flex-wrap justify-center gap-5 lg:justify-start'
      >
        <MetricCard
          label={t('dashboard.frontend')}
          value={overall.current?.frontend}
          change={frontendChange}
          goodChangeDirection='up'
          valueMapper={(value, type) =>
            type === 'badge' ? (
              `${value > 0 ? '+' : ''}${getStringFromTime(getTimeFromSeconds(value), true)}`
            ) : (
              <DurationFlow value={value} showMs />
            )
          }
        />
        <MetricCard
          label={t('dashboard.backend')}
          value={overall.current?.backend}
          change={backendChange}
          goodChangeDirection='up'
          valueMapper={(value, type) =>
            type === 'badge' ? (
              `${value > 0 ? '+' : ''}${getStringFromTime(getTimeFromSeconds(value), true)}`
            ) : (
              <DurationFlow value={value} showMs />
            )
          }
        />
        <MetricCard
          label={t('dashboard.network')}
          value={overall.current?.network}
          change={networkChange}
          goodChangeDirection='up'
          valueMapper={(value, type) =>
            type === 'badge' ? (
              `${value > 0 ? '+' : ''}${getStringFromTime(getTimeFromSeconds(value), true)}`
            ) : (
              <DurationFlow value={value} showMs />
            )
          }
        />
      </motion.div>
    )
  },
)

MetricCards.displayName = 'MetricCards'
PerformanceMetricCards.displayName = 'PerformanceMetricCards'
