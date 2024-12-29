import React from 'react'
import _map from 'lodash/map'
import cx from 'clsx'
import { FlameIcon, LayoutListIcon, PowerOffIcon, TrendingDownIcon, TrendingUpIcon } from 'lucide-react'

export const DASHBOARD_TABS = [
  {
    id: 'default',
    label: 'Default view',
    icon: LayoutListIcon,
  },
  {
    id: 'high-traffic',
    label: 'High traffic',
    icon: TrendingUpIcon,
  },
  {
    id: 'low-traffic',
    label: 'Low traffic',
    icon: TrendingDownIcon,
  },
  {
    id: 'performance',
    label: 'Performance',
    icon: FlameIcon,
  },
  {
    id: 'lost-traffic',
    label: 'Abandoned / Lost Traffic',
    icon: PowerOffIcon,
  },
] as const

interface TabsProps {
  activeTab: (typeof DASHBOARD_TABS)[number]['id']
  setActiveTab: React.Dispatch<React.SetStateAction<(typeof DASHBOARD_TABS)[number]['id']>>
  isLoading: boolean
  className?: string
}

export const Tabs = ({ activeTab, setActiveTab, className, isLoading }: TabsProps) => (
  <nav className={cx('-mb-px flex space-x-4 overflow-x-auto', className)} aria-label='Tabs'>
    {_map(DASHBOARD_TABS, (tab) => {
      const isCurrent = tab.id === activeTab

      return (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={cx(
            'text-md group inline-flex cursor-pointer items-center whitespace-nowrap border-b-2 px-1 py-2 font-bold',
            {
              'border-slate-900 text-slate-900 dark:border-gray-50 dark:text-gray-50': isCurrent,
              'border-transparent text-gray-500 dark:text-gray-400': !isCurrent,
              'cursor-wait': isLoading,
              'hover:border-gray-300 hover:text-gray-700 dark:hover:border-gray-300 dark:hover:text-gray-300':
                !isCurrent && !isLoading,
            },
          )}
          aria-current={isCurrent ? 'page' : undefined}
        >
          <tab.icon
            className={cx(
              isCurrent
                ? 'text-slate-900 dark:text-gray-50'
                : 'text-gray-500 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300',
              '-ml-0.5 mr-2 h-5 w-5',
            )}
            aria-hidden='true'
            strokeWidth={1.5}
          />
          <span>{tab.label}</span>
        </button>
      )
    })}
  </nav>
)
