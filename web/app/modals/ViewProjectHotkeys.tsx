import { TFunction } from 'i18next'
import _map from 'lodash/map'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Period } from '~/lib/constants'
import { Badge } from '~/ui/Badge'
import Modal from '~/ui/Modal'

interface ViewProjectHotkeysProps {
  onClose: () => void
  isOpened: boolean
}

interface HotkeysListProps {
  title: string
  hotkeys: Record<string, string>
}

export const PERIOD_HOTKEYS_MAP: Record<Period, string> = {
  '1h': 'H',
  today: 'T',
  yesterday: 'Y',
  '1d': 'D',
  '7d': 'W',
  '4w': 'M',
  '3M': 'Q',
  '12M': 'L',
  '24M': 'Z',
  all: 'A',
  custom: 'U',
  compare: 'C',
}

const getHotkeys = (t: TFunction) => ({
  [t('modals.shortcuts.timebuckets')]: {
    [t('project.thisHour')]: PERIOD_HOTKEYS_MAP['1h'],
    [t('project.today')]: PERIOD_HOTKEYS_MAP.today,
    [t('project.yesterday')]: PERIOD_HOTKEYS_MAP.yesterday,
    [t('project.last24h')]: PERIOD_HOTKEYS_MAP['1d'],
    [t('project.lastXDays', { amount: 7 })]: PERIOD_HOTKEYS_MAP['7d'],
    [t('project.lastXWeeks', { amount: 4 })]: PERIOD_HOTKEYS_MAP['4w'],
    [t('project.lastXMonths', { amount: 3 })]: PERIOD_HOTKEYS_MAP['3M'],
    [t('project.lastXMonths', { amount: 12 })]: PERIOD_HOTKEYS_MAP['12M'],
    [t('project.lastXMonths', { amount: 24 })]: PERIOD_HOTKEYS_MAP['24M'],
    [t('project.all')]: PERIOD_HOTKEYS_MAP.all,
    [t('project.compare')]: PERIOD_HOTKEYS_MAP.compare,
    [t('project.custom')]: PERIOD_HOTKEYS_MAP.custom,
  },
  [t('modals.shortcuts.tabs')]: {
    [t('dashboard.traffic')]: 'Shift + T',
    [t('dashboard.performance')]: 'Shift + P',
    [t('dashboard.sessions')]: 'Shift + S',
    [t('dashboard.errors')]: 'Shift + R',
    [t('dashboard.funnels')]: 'Shift + F',
    [t('dashboard.alerts')]: 'Shift + A',
    [t('common.settings')]: 'Shift + E',
  },
  [t('common.general')]: {
    [t('project.search')]: 'Alt + S',
    [t('project.barChart')]: 'Alt + B',
    [t('project.lineChart')]: 'Alt + L',
    [t('project.refreshStats')]: 'R',
  },
})

const HotkeysList = ({ title, hotkeys }: HotkeysListProps) => (
  <div className='mt-2 first:mt-0'>
    <table className='min-w-full divide-y divide-gray-300 dark:divide-gray-700'>
      <thead>
        <tr>
          <th className='pb-2 text-left text-base font-semibold text-gray-900 dark:text-gray-50'>
            {title}
          </th>
          <th />
        </tr>
      </thead>
      <tbody className='divide-y divide-gray-200 dark:divide-gray-800'>
        {_map(hotkeys, (action, label) => (
          <tr key={label}>
            <td className='py-2 pr-3 pl-4 text-left text-sm whitespace-nowrap text-gray-900 sm:pl-0 dark:text-gray-50'>
              {label}
            </td>
            <td className='py-2 pr-3 pl-4 text-left text-sm whitespace-nowrap text-gray-900 sm:pl-0 dark:text-gray-50'>
              <Badge colour='slate' label={action} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const ViewProjectHotkeys = ({ onClose, isOpened }: ViewProjectHotkeysProps) => {
  const { t } = useTranslation('common')
  const hotkeys = useMemo(() => getHotkeys(t), [t])

  return (
    <Modal
      onClose={onClose}
      message={
        <div className='mt-3 columns-1 gap-5 md:columns-2'>
          {_map(hotkeys, (_hotkeys, title) => (
            <HotkeysList title={title} hotkeys={_hotkeys} key={title} />
          ))}
        </div>
      }
      title={t('modals.shortcuts.title')}
      isOpened={isOpened}
      size='large'
    />
  )
}

export default ViewProjectHotkeys
