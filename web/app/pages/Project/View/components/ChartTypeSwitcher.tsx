import { ChartBarIcon, ChartLineIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { chartTypes } from '~/lib/constants'

interface ChartTypeSwitcherProps {
  type: (typeof chartTypes)[keyof typeof chartTypes]
  onSwitch: (type: (typeof chartTypes)[keyof typeof chartTypes]) => void
}

export const ChartTypeSwitcher = ({
  type,
  onSwitch,
}: ChartTypeSwitcherProps) => {
  const { t } = useTranslation('common')

  if (type === chartTypes.bar) {
    return (
      <button
        type='button'
        title={t('project.lineChart')}
        onClick={() => onSwitch(chartTypes.line)}
        className='rounded-md border border-transparent p-1.5 text-sm font-medium transition-colors ring-inset hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden hover:dark:border-slate-700/80 hover:dark:bg-slate-950 focus:dark:ring-gray-200'
      >
        <ChartLineIcon className='h-5 w-5 text-gray-700 dark:text-gray-50' />
      </button>
    )
  }

  return (
    <button
      type='button'
      title={t('project.barChart')}
      onClick={() => onSwitch(chartTypes.bar)}
      className='rounded-md border border-transparent p-1.5 text-sm font-medium transition-colors ring-inset hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden hover:dark:border-slate-700/80 hover:dark:bg-slate-950 focus:dark:ring-gray-200'
    >
      <ChartBarIcon className='h-5 w-5 text-gray-700 dark:text-gray-50' />
    </button>
  )
}
