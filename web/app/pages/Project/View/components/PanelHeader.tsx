import { ArrowsOutSimpleIcon } from '@phosphor-icons/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Button, { buttonClasses } from '~/ui/Button'
import Dropdown from '~/ui/Dropdown'

interface PanelTab {
  id: string
  label: string
}

export interface PanelHeaderProps {
  name: ReactNode
  tabs?: (PanelTab | PanelTab[])[]
  activeTabId?: string
  onTabChange?: (id: string) => void
  dropdownPlaceholder?: string
  tooltip?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  onDetailsClick?: () => void
  detailsDisabled?: boolean
}

export const panelControlClasses = (active = false) =>
  buttonClasses({
    variant: 'ghost',
    size: 'sm',
    className: `shrink-0 px-2 py-1 whitespace-nowrap font-medium md:px-2 focus-visible:ring-inset focus-visible:ring-offset-0 motion-reduce:transition-none motion-reduce:active:scale-100 ${
      active
        ? 'bg-gray-100 text-gray-900 hover:bg-gray-200/70 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-slate-800 dark:hover:text-gray-50'
    }`,
  })

export const PanelHeader = ({
  name,
  tabs,
  activeTabId,
  onTabChange,
  dropdownPlaceholder,
  tooltip,
  actions,
  children,
  onDetailsClick,
  detailsDisabled,
}: PanelHeaderProps) => {
  const { t } = useTranslation('common')
  const label = typeof name === 'string' ? name : undefined
  const controlsRef = useRef<HTMLFieldSetElement>(null)

  useEffect(() => {
    const controls = controlsRef.current
    const selected = controls?.querySelector<HTMLElement>(
      '[aria-pressed="true"], .panel-active-tab',
    )
    if (!controls || !selected) return
    const bounds = controls.getBoundingClientRect()
    const selectedBounds = selected.getBoundingClientRect()
    if (selectedBounds.left < bounds.left) {
      controls.scrollLeft += selectedBounds.left - bounds.left
    } else if (selectedBounds.right > bounds.right) {
      controls.scrollLeft += selectedBounds.right - bounds.right
    }
  }, [activeTabId])

  return (
    <div className='mb-2 flex min-w-0 items-center gap-2'>
      <fieldset
        ref={controlsRef}
        className='m-0 flex min-h-7 min-w-0 flex-1 scrollbar-thin items-center gap-0.5 overflow-x-auto overflow-y-hidden border-0 p-0'
        aria-label={label}
      >
        {children ??
          (tabs?.length && onTabChange ? (
            tabs.map((tab, index) => {
              if (Array.isArray(tab)) {
                const active = tab.find((item) => item.id === activeTabId)
                return (
                  <Dropdown
                    key={`dropdown-${index}`}
                    title={
                      active?.label ||
                      dropdownPlaceholder ||
                      t('project.campaigns')
                    }
                    items={tab}
                    labelExtractor={(item) => item.label}
                    keyExtractor={(item) => item.id}
                    onSelect={(item, _event, close) => {
                      onTabChange(item.id)
                      close()
                    }}
                    className={
                      active ? 'panel-active-tab shrink-0' : 'shrink-0'
                    }
                    buttonClassName={panelControlClasses(!!active)}
                    headless
                    chevron='mini'
                  />
                )
              }

              return (
                <button
                  key={tab.id}
                  type='button'
                  aria-pressed={activeTabId === tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={panelControlClasses(activeTabId === tab.id)}
                >
                  {tab.label}
                </button>
              )
            })
          ) : (
            <h3 className='px-1 py-1 text-sm leading-4 font-semibold text-gray-900 dark:text-gray-50'>
              {name}
            </h3>
          ))}
      </fieldset>
      {tooltip}
      {actions}
      {onDetailsClick ? (
        <Button
          variant='ghost'
          className='size-7 shrink-0 justify-center p-0 focus-visible:ring-offset-0 focus-visible:ring-inset motion-reduce:transition-none motion-reduce:active:scale-100'
          onClick={onDetailsClick}
          disabled={detailsDisabled}
          aria-label={
            label ? `${t('common.details')}: ${label}` : t('common.details')
          }
          title={t('common.details')}
        >
          <ArrowsOutSimpleIcon className='size-4' aria-hidden />
        </Button>
      ) : null}
    </div>
  )
}
