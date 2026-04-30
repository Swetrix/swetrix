import { ChartBarIcon, ChartLineIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { chartTypes } from '~/lib/constants'
import Button from '~/ui/Button'

interface ChartTypeSwitcherProps {
  type: (typeof chartTypes)[keyof typeof chartTypes]
  onSwitch: (type: (typeof chartTypes)[keyof typeof chartTypes]) => void
}

export const ChartTypeSwitcher = ({
  type,
  onSwitch,
}: ChartTypeSwitcherProps) => {
  const { t } = useTranslation('common')

  const isBar = type === chartTypes.bar
  const label = isBar ? t('project.lineChart') : t('project.barChart')
  const Icon = isBar ? ChartLineIcon : ChartBarIcon

  return (
    <Button
      variant='icon'
      title={label}
      aria-label={label}
      onClick={() => onSwitch(isBar ? chartTypes.line : chartTypes.bar)}
    >
      <Icon className='size-5 text-gray-700 dark:text-gray-50' />
    </Button>
  )
}
