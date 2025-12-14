import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/20/solid'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import { ArrowLongRightIcon, ArrowLongLeftIcon } from '@heroicons/react/24/solid'
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual'
import cx from 'clsx'
import _ceil from 'lodash/ceil'
import _floor from 'lodash/floor'
import _fromPairs from 'lodash/fromPairs'
import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _orderBy from 'lodash/orderBy'
import _reduce from 'lodash/reduce'
import _reverse from 'lodash/reverse'
import _round from 'lodash/round'
import _size from 'lodash/size'
import _slice from 'lodash/slice'
import _sortBy from 'lodash/sortBy'
import _sum from 'lodash/sum'
import _toPairs from 'lodash/toPairs'
import { FilterIcon, ScanIcon } from 'lucide-react'
import React, { memo, useState, useEffect, useMemo, Fragment, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, LinkProps, useNavigate } from 'react-router'

import { PROJECT_TABS } from '~/lib/constants'
import { Entry } from '~/lib/models/Entry'
import Button from '~/ui/Button'
import Dropdown from '~/ui/Dropdown'
import Sort from '~/ui/icons/Sort'
import Spin from '~/ui/icons/Spin'
import Modal from '~/ui/Modal'
import { Text } from '~/ui/Text'
import { nFormatter, getLocaleDisplayName } from '~/utils/generic'
import countries from '~/utils/isoCountries'

import { Customs, Filter, Properties } from './interfaces/traffic'
import { useViewProjectContext } from './ViewProject'
import { typeNameMapping } from './ViewProject.helpers'

const ENTRIES_PER_PANEL = 8
const ENTRIES_PER_CUSTOM_EVENTS_PANEL = 7

interface PanelContainerProps {
  name: React.ReactNode
  children?: React.ReactNode
  icon?: React.ReactNode
  type: string
  tabs?: Array<
    | {
        id: string
        label: string
      }
    | Array<{
        id: string
        label: string
      }>
  >
  onTabChange?: (tab: string) => void
  activeTabId?: string
  onDetailsClick?: () => void
}

const PanelContainer = ({
  name,
  children,
  icon,
  type,
  tabs,
  onTabChange,
  activeTabId,
  onDetailsClick,
}: PanelContainerProps) => {
  const { t } = useTranslation('common')

  return (
    <div
      className={cx(
        'overflow-hidden rounded-lg border border-gray-300 bg-white px-4 pt-5 pb-3 dark:border-slate-800/60 dark:bg-slate-800/25',
        {
          'col-span-full sm:col-span-2': type === 'metadata',
        },
      )}
    >
      <div className='mb-2 flex items-center justify-between gap-4'>
        <Text as='h3' size='lg' weight='semibold' className='flex items-center leading-6 whitespace-nowrap'>
          {icon ? <span className='mr-1'>{icon}</span> : null}
          {name}
        </Text>
        <div className='scrollbar-thin flex items-center gap-2.5 overflow-x-auto'>
          {tabs && onTabChange ? (
            <>
              {tabs.map((tab, index) => {
                if (Array.isArray(tab)) {
                  const dropdownTabs = tab
                  const activeDropdownTab = dropdownTabs.find((t) => t.id === activeTabId)
                  const dropdownTitle = activeDropdownTab ? activeDropdownTab.label : t('project.campaigns')

                  return (
                    <Dropdown
                      key={`dropdown-${index}`}
                      title={dropdownTitle}
                      items={dropdownTabs}
                      labelExtractor={(item) => item.label}
                      keyExtractor={(item) => item.id}
                      onSelect={(item) => {
                        onTabChange(item.id)
                      }}
                      buttonClassName={cx(
                        'relative border-b-2 px-0 md:px-0 py-1 text-sm font-bold whitespace-nowrap transition-all duration-200',
                        {
                          'border-slate-900 text-slate-900 dark:border-gray-50 dark:text-gray-50': dropdownTabs.some(
                            (t) => t.id === activeTabId,
                          ),
                          'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-300 dark:hover:text-gray-300':
                            !dropdownTabs.some((t) => t.id === activeTabId),
                        },
                      )}
                      headless
                      chevron='mini'
                    />
                  )
                }

                // Regular tab button
                return (
                  <button
                    key={tab.id}
                    type='button'
                    onClick={() => {
                      onTabChange(tab.id)
                    }}
                    className={cx(
                      'relative border-b-2 py-1 text-sm font-bold whitespace-nowrap transition-all duration-200',
                      {
                        'border-slate-900 text-slate-900 dark:border-gray-50 dark:text-gray-50': activeTabId === tab.id,
                        'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-300 dark:hover:text-gray-300':
                          activeTabId !== tab.id,
                      },
                    )}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </>
          ) : null}
        </div>
      </div>
      <div className='relative flex h-[19.6rem] flex-col overflow-x-auto'>{children}</div>
      {onDetailsClick ? (
        <div className='mt-2 flex items-center justify-center'>
          <Button
            className='max-w-max border border-transparent bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-slate-800/50 dark:bg-slate-800 dark:text-gray-200 hover:dark:bg-slate-700'
            type='button'
            onClick={onDetailsClick}
          >
            <ScanIcon className='mr-1.5 size-4' />
            <span>{t('common.details')}</span>
          </Button>
        </div>
      ) : null}
    </div>
  )
}

interface MetadataProps {
  customs?: Customs
  properties?: Properties
  chartData: any
  filters: Filter[]
  getCustomEventMetadata: (event: string) => Promise<any>
  getPropertyMetadata: (property: string) => Promise<any>
  getFilterLink: (column: string, value: string | null) => LinkProps['to']
  onTabChange: (tab: string) => void
  activeTabId: string
}

interface SortRows {
  label: string
  sortByAscend: boolean
  sortByDescend: boolean
}

interface KVTableContainerProps {
  data: any
  uniques: number
  onClick: (key: string, value: string | null) => void
  displayKeyAsHeader?: boolean
}

interface KVTableProps {
  listId: string
  data: {
    event: string
    quantity: number
    conversion: number
  }[]
  onClick: KVTableContainerProps['onClick']
  displayKeyAsHeader?: KVTableContainerProps['displayKeyAsHeader']
}

const KVTable = ({ listId, data, displayKeyAsHeader, onClick }: KVTableProps) => {
  const { t } = useTranslation('common')
  const [sort, setSort] = useState<SortRows>({
    label: 'quantity',
    sortByAscend: false,
    sortByDescend: false,
  })

  const sortedData = useMemo(() => {
    return data.sort((a: any, b: any) => {
      if (sort.label === 'quantity') {
        return sort.sortByAscend ? a.quantity - b.quantity : b.quantity - a.quantity
      }

      if (sort.label === 'conversion') {
        return sort.sortByAscend ? a.conversion - b.conversion : b.conversion - a.conversion
      }

      return sort.sortByAscend ? a.event.localeCompare(b.event) : b.event.localeCompare(a.event)
    })
  }, [data, sort])

  const onSortBy = (label: string) => {
    if (sort.sortByAscend) {
      setSort({
        label,
        sortByAscend: false,
        sortByDescend: true,
      })
      return
    }

    if (sort.sortByDescend) {
      setSort({
        label,
        sortByAscend: false,
        sortByDescend: false,
      })
      return
    }

    setSort({
      label,
      sortByAscend: true,
      sortByDescend: false,
    })
  }

  return (
    <table className='mb-4 w-full border-separate border-spacing-y-1'>
      <thead>
        <tr className='text-gray-600 dark:text-gray-200'>
          <th
            onClick={() => onSortBy('event')}
            className='flex w-2/5 cursor-pointer items-center pl-2 text-left sm:w-4/6'
          >
            {displayKeyAsHeader ? listId : t('project.value')}
            <Sort
              className='ml-1'
              sortByAscend={sort.label === 'event' ? sort.sortByAscend : null}
              sortByDescend={sort.label === 'event' ? sort.sortByDescend : null}
            />
          </th>
          <th className='w-[30%] sm:w-1/6'>
            <p onClick={() => onSortBy('quantity')} className='flex cursor-pointer items-center justify-end'>
              {t('project.quantity')}
              <Sort
                className='ml-1'
                sortByAscend={sort.label === 'quantity' ? sort.sortByAscend : null}
                sortByDescend={sort.label === 'quantity' ? sort.sortByDescend : null}
              />
            </p>
          </th>
          <th className='w-[30%] pr-2 sm:w-1/6'>
            <p onClick={() => onSortBy('conversion')} className='flex cursor-pointer items-center justify-end'>
              {t('project.conversion')}
              <Sort
                className='ml-1'
                sortByAscend={sort.label === 'conversion' ? sort.sortByAscend : null}
                sortByDescend={sort.label === 'conversion' ? sort.sortByDescend : null}
              />
            </p>
          </th>
        </tr>
      </thead>
      <tbody>
        {_map(sortedData, ({ event, quantity, conversion }) => (
          <tr
            key={event}
            onClick={() => {
              onClick(listId, event)
            }}
            className='group cursor-pointer py-3 text-gray-900 transition-colors even:bg-gray-50 hover:bg-gray-100 dark:text-gray-50 dark:even:bg-slate-800 hover:dark:bg-slate-700'
          >
            <td className='flex w-2/5 items-center py-1 pl-2 text-left sm:w-4/6'>
              {event}
              <FilterIcon
                className='ml-2 hidden h-4 w-4 shrink-0 text-gray-500 group-hover:block dark:text-gray-300'
                strokeWidth={1.5}
              />
              <div className='ml-2 h-4 w-4 group-hover:hidden' />
            </td>
            <td className='w-[30%] py-1 text-right sm:w-1/6'>
              {quantity}
              &nbsp;&nbsp;
            </td>
            <td className='w-[30%] py-1 pr-2 text-right sm:w-1/6'>{conversion}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const KVTableContainer = ({ data, uniques, displayKeyAsHeader, onClick }: KVTableContainerProps) => {
  const { t } = useTranslation('common')
  const processed = useMemo(() => {
    return _reduce(
      data,
      (acc: any, curr: any) => {
        if (!acc[curr.key]) {
          acc[curr.key] = []
        }

        acc[curr.key].push({
          event: curr.value,
          quantity: curr.count,
          conversion: uniques === 0 ? 100 : _round((curr.count / uniques) * 100, 2),
        })

        return acc
      },
      {},
    )
  }, [data, uniques])

  if (_isEmpty(data)) {
    return (
      <Text as='p' size='base' colour='secondary' className='mb-2'>
        {t('project.noData')}
      </Text>
    )
  }

  return _map(processed, (value, key) => {
    return <KVTable key={key} listId={key} data={value} displayKeyAsHeader={displayKeyAsHeader} onClick={onClick} />
  })
}

function sortAsc<T>(obj: T, sortByKeys?: boolean): T {
  if (sortByKeys) {
    // @ts-expect-error
    return _fromPairs(_sortBy(_toPairs(obj), (pair) => pair[0])) as T
  }

  return _fromPairs(
    // @ts-expect-error
    _toPairs(obj).sort((a: any, b: any) => {
      return b[1] - a[1]
    }),
  ) as T
}

function sortDesc<T>(obj: T, sortByKeys?: boolean): T {
  if (sortByKeys) {
    // @ts-expect-error
    return _fromPairs(_reverse(_sortBy(_toPairs(obj), (pair) => pair[0]))) as T
  }

  return _fromPairs(
    // @ts-expect-error
    _toPairs(obj).sort((a: any, b: any) => {
      return a[1] - b[1]
    }),
  ) as T
}

const Metadata = ({
  customs,
  properties,
  chartData,
  filters,
  getCustomEventMetadata,
  getPropertyMetadata,
  getFilterLink,
  onTabChange,
  activeTabId,
}: MetadataProps) => {
  const { t } = useTranslation('common')
  const [detailsOpened, setDetailsOpened] = useState(false)
  const [activeEvents, setActiveEvents] = useState<any>({})
  const [loadingEvents, setLoadingEvents] = useState<any>({})
  const [eventsMetadata, setEventsMetadata] = useState<any>({})
  const [eventsData, setEventsData] = useState<any>(customs)
  const [triggerEventWhenFiltersChange, setTriggerEventWhenFiltersChange] = useState<string | null>(null)

  const keys = _keys(eventsData)
  const keysToDisplay = useMemo(() => _slice(keys, 0, ENTRIES_PER_CUSTOM_EVENTS_PANEL), [keys])

  const uniques = _sum(chartData.uniques)
  const [sort, setSort] = useState<SortRows>({
    label: 'quantity',
    sortByAscend: false,
    sortByDescend: false,
  })
  const navigate = useNavigate()

  const tabs = [
    {
      id: 'ce',
      label: t('project.customEv'),
    },
    {
      id: 'props',
      label: t('project.properties'),
    },
  ]

  useEffect(() => {
    if (activeTabId === 'ce') {
      setEventsData(customs)
    } else {
      setEventsData(properties)
    }

    setSort({
      label: 'quantity',
      sortByAscend: false,
      sortByDescend: false,
    })
  }, [customs, properties, activeTabId])

  useEffect(() => {
    setEventsMetadata({})
    const evToSkip = triggerEventWhenFiltersChange
    const openEvents = Object.keys(activeEvents).filter((key) => activeEvents[key] && key !== evToSkip)
    openEvents.forEach((ev) => {
      toggleDetails(ev)()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  useEffect(() => {
    if (!triggerEventWhenFiltersChange) {
      return
    }

    toggleDetails(triggerEventWhenFiltersChange)()
    setTriggerEventWhenFiltersChange(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, triggerEventWhenFiltersChange])

  // is "e" is not set, then details loading is forced and all checks are skipped
  const toggleDetails = (ev: string) => async (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.stopPropagation()

      setActiveEvents((events: any) => ({
        ...events,
        [ev]: !events[ev],
      }))
    }

    if (!e || !eventsMetadata[ev]) {
      setLoadingEvents((events: any) => ({
        ...events,
        [ev]: true,
      }))

      try {
        const fn = activeTabId === 'ce' ? getCustomEventMetadata : getPropertyMetadata

        const { result } = await fn(ev)
        setEventsMetadata((metadata: any) => ({
          ...metadata,
          [ev]: result,
        }))
      } catch (reason) {
        console.error(`[ERROR](toggleDetails) Failed to get metadata for event ${ev}`, reason)
        setEventsMetadata((metadata: any) => ({
          ...metadata,
          [ev]: [],
        }))
      }

      setLoadingEvents((events: any) => ({
        ...events,
        [ev]: false,
      }))
    }
  }

  const onModalClose = () => {
    setDetailsOpened(false)

    // a timeout is needed to prevent the flicker of data fields in the modal when closing
    setTimeout(() => {
      setActiveEvents({})
      setEventsMetadata({})
    }, 300)
  }

  const onSortBy = (label: string) => {
    const sortByKeys = label === 'event'

    if (sort.sortByAscend) {
      setEventsData(sortDesc(eventsData, sortByKeys))
      setSort({
        label,
        sortByAscend: false,
        sortByDescend: true,
      })
      return
    }

    if (sort.sortByDescend) {
      setEventsData(eventsData)
      setSort({
        label,
        sortByAscend: false,
        sortByDescend: false,
      })
      return
    }

    setEventsData(sortAsc(eventsData, sortByKeys))
    setSort({
      label,
      sortByAscend: true,
      sortByDescend: false,
    })
  }

  const _getFilterLink = (column: string | null, value: string | null) => {
    if (activeTabId === 'ce') {
      return getFilterLink('ev' + (column ? `:key:${column}` : ''), value)
    }
    return getFilterLink('tag:key' + (column ? `:${column}` : ''), value)
  }

  const CustomEventsTable = () => (
    <div className='overflow-y-auto'>
      <table className='w-full border-separate border-spacing-y-1'>
        <thead>
          <tr className='text-base text-gray-900 dark:text-gray-50'>
            <th
              className='flex w-2/5 cursor-pointer items-center pl-2 text-left hover:opacity-90 sm:w-4/6'
              onClick={() => onSortBy('event')}
            >
              {activeTabId === 'props' ? t('project.property') : t('project.event')}
              <Sort
                className='ml-1'
                sortByAscend={sort.label === 'event' ? sort.sortByAscend : null}
                sortByDescend={sort.label === 'event' ? sort.sortByDescend : null}
              />
            </th>
            <th className='w-[30%] sm:w-1/6'>
              <p
                className='flex cursor-pointer items-center justify-end hover:opacity-90'
                onClick={() => onSortBy('quantity')}
              >
                {t('project.quantity')}
                <Sort
                  className='ml-1'
                  sortByAscend={sort.label === 'quantity' ? sort.sortByAscend : null}
                  sortByDescend={sort.label === 'quantity' ? sort.sortByDescend : null}
                />
                &nbsp;&nbsp;
              </p>
            </th>
            <th className='w-[30%] pr-2 sm:w-1/6'>
              <p
                className='flex cursor-pointer items-center justify-end hover:opacity-90'
                onClick={() => onSortBy('conversion')}
              >
                {t('project.conversion')}
                <Sort
                  className='ml-1'
                  sortByAscend={sort.label === 'conversion' ? sort.sortByAscend : null}
                  sortByDescend={sort.label === 'conversion' ? sort.sortByDescend : null}
                />
              </p>
            </th>
          </tr>
        </thead>
        <tbody>
          {_map(keys, (ev) => (
            <Fragment key={ev}>
              <tr
                className='group cursor-pointer text-base text-gray-900 transition-colors even:bg-gray-50 hover:bg-gray-100 dark:text-gray-50 dark:even:bg-slate-800 hover:dark:bg-slate-700'
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const link = _getFilterLink(null, ev)
                  navigate(link)
                  setTriggerEventWhenFiltersChange(ev)
                }}
              >
                <td className='flex items-center py-1 text-left'>
                  <button
                    className='peer z-10 -m-1 ml-1 rounded-md border border-transparent p-1 transition-colors hover:border-gray-300 hover:bg-white hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200'
                    type='button'
                    onClick={toggleDetails(ev)}
                  >
                    {loadingEvents[ev] ? (
                      <Spin className='!m-0.5' />
                    ) : activeEvents[ev] ? (
                      <ChevronUpIcon className='size-5 text-gray-500 dark:text-gray-300' />
                    ) : (
                      <ChevronDownIcon className='size-5 text-gray-500 dark:text-gray-300' />
                    )}
                  </button>
                  <span className='pl-2'>{ev}</span>
                  <FilterIcon
                    className='ml-2 hidden h-4 w-4 shrink-0 text-gray-500 group-hover:block peer-hover:hidden dark:text-gray-300'
                    strokeWidth={1.5}
                  />
                  <div className='ml-2 h-4 w-4 group-hover:hidden peer-hover:block' />
                </td>
                <td className='w-[30%] py-1 text-right sm:w-1/6'>
                  {eventsData[ev]}
                  &nbsp;&nbsp;
                </td>
                <td className='w-[30%] py-1 pr-2 text-right sm:w-1/6'>
                  {uniques === 0 ? 100 : _round((eventsData[ev] / uniques) * 100, 2)}%
                </td>
              </tr>
              {activeEvents[ev] && !loadingEvents[ev] ? (
                <tr>
                  <td className='pl-9' colSpan={3}>
                    <KVTableContainer
                      data={eventsMetadata[ev]}
                      uniques={uniques}
                      onClick={async (key, value) => {
                        const link = _getFilterLink(key, value)
                        navigate(link)
                        setTriggerEventWhenFiltersChange(ev)
                      }}
                      displayKeyAsHeader
                    />
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )

  const renderTabContent = () => {
    if (_isEmpty(eventsData)) {
      return (
        <Text as='p' size='base' colour='secondary' className='mt-1'>
          {t('project.noParamData')}
        </Text>
      )
    }

    return (
      <>
        <div className='mb-1 flex items-center justify-between px-1 py-1'>
          <Text size='sm' weight='medium' colour='muted' className='w-4/6'>
            {activeTabId === 'props' ? t('project.property') : t('project.event')}
          </Text>
          <Text size='sm' weight='medium' colour='muted' className='w-1/6 text-right'>
            {t('project.quantity')}
          </Text>
          <Text size='sm' weight='medium' colour='muted' className='w-1/6 text-right'>
            {t('project.conversion')}
          </Text>
        </div>

        <div className='space-y-0.5'>
          {_map(
            _orderBy(
              keysToDisplay.map((ev) => ({ key: ev, value: eventsData[ev] })),
              'value',
              'desc',
            ),
            (item) => {
              const ev = item.key
              const perc = uniques === 0 ? 100 : _round((eventsData[ev] / uniques) * 100, 2)
              const maxValue = Math.max(...(Object.values(eventsData) as number[]))
              const link = _getFilterLink(null, ev)

              return (
                <div
                  key={`${ev}-${item.value}`}
                  className='group relative flex cursor-pointer items-center rounded-sm px-1 py-1.5 hover:bg-gray-50 dark:text-gray-50 hover:dark:bg-slate-800'
                  onClick={() => {
                    navigate(link)
                  }}
                >
                  <div
                    className='absolute inset-0 rounded-sm bg-blue-50 dark:bg-blue-900/10'
                    style={{
                      width: `${(eventsData[ev] / maxValue) * 100}%`,
                    }}
                  />

                  <div className='relative z-10 flex w-4/6 min-w-0 items-center'>
                    <Text size='sm' truncate>
                      {ev}
                    </Text>
                    <FilterIcon
                      className='ml-2 hidden h-4 w-4 shrink-0 text-gray-500 group-hover:block dark:text-gray-300'
                      strokeWidth={1.5}
                    />
                    <div className='ml-2 h-4 w-4 group-hover:hidden' />
                  </div>
                  <div className='relative z-10 w-1/6 text-right'>
                    <Text size='sm' weight='medium'>
                      {eventsData[ev]}
                    </Text>
                  </div>
                  <div className='relative z-10 w-1/6 text-right'>
                    <Text size='sm' weight='medium'>
                      {perc}%
                    </Text>
                  </div>
                </div>
              )
            },
          )}
        </div>
        <Modal
          onClose={onModalClose}
          isOpened={detailsOpened}
          title={activeTabId === 'props' ? t('project.properties') : t('project.customEv')}
          message={<CustomEventsTable />}
          size='large'
        />
      </>
    )
  }

  return (
    <PanelContainer
      name={t('project.metadata')}
      type='metadata'
      tabs={tabs}
      onTabChange={onTabChange}
      activeTabId={activeTabId}
      onDetailsClick={() => setDetailsOpened(true)}
    >
      {renderTabContent()}
    </PanelContainer>
  )
}

interface FilterWrapperProps {
  children: React.ReactNode
  as: 'Link' | 'div'
  to?: LinkProps['to']
  [key: string]: any
}

const FilterWrapper = ({ children, as, to, ...props }: FilterWrapperProps) => {
  if (as === 'Link') {
    return (
      <Link {...(props as any)} to={to}>
        {children}
      </Link>
    )
  }

  return <div {...props}>{children}</div>
}

interface PanelProps {
  name: string
  data: Entry[]
  rowMapper?: (row: any) => React.ReactNode
  valueMapper?: (value: number) => number
  capitalize?: boolean
  linkContent?: boolean
  icon: any
  id: string
  hideFilters?: boolean
  getFilterLink?: (column: string, value: string | null) => LinkProps['to']
  tabs?: Array<
    | {
        id: string
        label: string
      }
    | Array<{
        id: string
        label: string
      }>
  >
  onTabChange?: (tab: string) => void
  activeTabId?: string
  customRenderer?: () => React.ReactNode
  versionData?: { [key: string]: Entry[] }
  getVersionFilterLink?: (parent: string | null, version: string | null) => LinkProps['to']
  valuesHeaderName?: string
  highlightColour?: 'blue' | 'red' | 'orange'
  // When true, rows are non-interactive (no filter link/navigation)
  disableRowClick?: boolean
  // Details modal specific overrides
  hidePercentageInDetails?: boolean
  detailsExtraColumns?: Array<{
    header: string
    render: (entry: Entry) => React.ReactNode
    sortLabel: string
    getSortValue: (entry: Entry) => number
  }>
}

interface DetailsTableProps
  extends Pick<
    PanelProps,
    | 'data'
    | 'id'
    | 'valuesHeaderName'
    | 'activeTabId'
    | 'capitalize'
    | 'linkContent'
    | 'rowMapper'
    | 'valueMapper'
    | 'getFilterLink'
  > {
  total: number
  closeDetails: () => void
  disableRowClick?: boolean
  hidePercentageInDetails?: boolean
  detailsExtraColumns?: Array<{
    header: string
    render: (entry: Entry) => React.ReactNode
    sortLabel: string
    getSortValue: (entry: Entry) => number
  }>
}

const DetailsTable = ({
  data,
  rowMapper = (row: Entry): React.ReactNode => row.name,
  valueMapper = (value: number): number => value,
  capitalize,
  linkContent,
  getFilterLink = () => '',
  id,
  total,
  valuesHeaderName,
  activeTabId,
  closeDetails,
  disableRowClick,
  hidePercentageInDetails,
  detailsExtraColumns,
}: DetailsTableProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { activeTab } = useViewProjectContext()
  const tnMapping = typeNameMapping(t)
  const parentRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const [sortedData, setSortedData] = useState(data)
  const [sort, setSort] = useState<SortRows>({
    label: 'quantity',
    sortByAscend: false,
    sortByDescend: false,
  })
  const filteredData = useMemo(() => {
    if (!search) return sortedData
    const searchLower = search.toLowerCase()
    const getSearchLabel = (entry: Entry): string => {
      if (activeTabId === 'cc') {
        const code = (entry as any)?.cc || entry?.name
        try {
          const countryName = code ? countries.getName(code, language) : ''
          return (countryName || '').toLowerCase()
        } catch {
          return (entry?.name || '').toLowerCase()
        }
      }
      if (activeTabId === 'lc') {
        try {
          return (getLocaleDisplayName(entry?.name, language) || entry?.name || '').toLowerCase()
        } catch {
          return (entry?.name || '').toLowerCase()
        }
      }
      return (entry?.name || '').toLowerCase()
    }

    return sortedData.filter((entry) => {
      return getSearchLabel(entry).includes(searchLower)
    })
  }, [search, sortedData, activeTabId, language])

  const rowVirtualizer = useVirtualizer({
    count: filteredData.length,
    getScrollElement: () => parentRef.current,
    overscan: 8,
    estimateSize: () => 36,
  })

  const onSortBy = (label: string) => {
    const getValue = (entry: Entry): number | string => {
      if (label === 'quantity') return entry.count
      if (label === 'name') return entry.name || ''
      const extra = detailsExtraColumns?.find((c) => c.sortLabel === label)
      if (extra) return extra.getSortValue(entry)
      return 0
    }

    if (sort.sortByAscend) {
      const newData = [...sortedData].sort((a, b) => {
        if (label === 'name') return (getValue(a) as string).localeCompare(getValue(b) as string)
        return (getValue(a) as number) - (getValue(b) as number)
      })
      setSortedData(newData)
      setSort({ label, sortByAscend: false, sortByDescend: true })
      return
    }

    if (sort.sortByDescend) {
      setSortedData([...data])
      setSort({ label, sortByAscend: false, sortByDescend: false })
      return
    }

    const newData = [...sortedData].sort((a, b) => {
      if (label === 'name') return (getValue(a) as string).localeCompare(getValue(b) as string)
      return (getValue(b) as number) - (getValue(a) as number)
    })
    setSortedData(newData)
    setSort({ label, sortByAscend: true, sortByDescend: false })
  }

  useEffect(() => {
    setSortedData(data)
    setSort({
      label: 'quantity',
      sortByAscend: false,
      sortByDescend: false,
    })
  }, [data])

  return (
    <div>
      <div className='mb-2'>
        <input
          type='text'
          placeholder={t('project.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-gray-50'
        />
      </div>
      <div ref={parentRef} className='max-h-[500px] overflow-y-auto'>
        <table className='w-full border-separate border-spacing-y-1'>
          <thead className='sticky top-0 z-10 bg-white dark:bg-slate-900'>
            <tr className='text-base text-gray-900 dark:text-gray-50'>
              <th
                className='flex cursor-pointer items-center pl-2 text-left hover:opacity-90'
                style={{ width: '40%' }}
                onClick={() => onSortBy('name')}
              >
                {tnMapping[activeTabId as keyof typeof tnMapping]}
                <Sort
                  className='ml-1'
                  sortByAscend={sort.label === 'name' ? sort.sortByAscend : null}
                  sortByDescend={sort.label === 'name' ? sort.sortByDescend : null}
                />
              </th>
              {(() => {
                const numericColsCount = 1 + (detailsExtraColumns?.length || 0) + (!hidePercentageInDetails ? 1 : 0)
                const numericColWidth = `${(60 / numericColsCount).toFixed(3)}%`
                return (
                  <th style={{ width: numericColWidth }}>
                    <p
                      className='flex cursor-pointer items-center justify-end hover:opacity-90'
                      onClick={() => onSortBy('quantity')}
                    >
                      {valuesHeaderName || t('project.visitors')}
                      <Sort
                        className='ml-1'
                        sortByAscend={sort.label === 'quantity' ? sort.sortByAscend : null}
                        sortByDescend={sort.label === 'quantity' ? sort.sortByDescend : null}
                      />
                      &nbsp;&nbsp;
                    </p>
                  </th>
                )
              })()}
              {(() => {
                const numericColsCount = 1 + (detailsExtraColumns?.length || 0) + (!hidePercentageInDetails ? 1 : 0)
                const numericColWidth = `${(60 / numericColsCount).toFixed(3)}%`
                return (
                  <>
                    {detailsExtraColumns?.map((col, idx) => (
                      <th key={`extra-col-${idx}`} style={{ width: numericColWidth }} className='pr-2'>
                        <p
                          className='flex cursor-pointer items-center justify-end hover:opacity-90'
                          onClick={() => onSortBy(col.sortLabel)}
                        >
                          {col.header}
                          <Sort
                            className='ml-1'
                            sortByAscend={sort.label === col.sortLabel ? sort.sortByAscend : null}
                            sortByDescend={sort.label === col.sortLabel ? sort.sortByDescend : null}
                          />
                        </p>
                      </th>
                    ))}
                    {!hidePercentageInDetails ? (
                      <th style={{ width: numericColWidth }} className='pr-2'>
                        <p className='flex items-center justify-end'>{t('project.percentage')}</p>
                      </th>
                    ) : null}
                  </>
                )
              })()}
            </tr>
          </thead>

          <tbody style={{ position: 'relative', height: `${rowVirtualizer.getTotalSize()}px` }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
              const entry = filteredData[virtualRow.index]
              if (!entry) return null

              const { count, name: entryName, ...rest } = entry
              const perc = _round((count / total) * 100, 2)
              const rowData = rowMapper(entry)
              const valueData = valueMapper(count)

              return (
                <tr
                  key={`${id}-${entryName}-${Object.values(rest).join('-')}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    transform: `translateY(${virtualRow.start}px)`,
                    width: '100%',
                    display: 'flex',
                  }}
                  className={cx(
                    'group cursor-pointer text-base text-gray-900 even:bg-gray-50 hover:bg-gray-100 dark:text-gray-50 dark:even:bg-slate-800 hover:dark:bg-slate-700',
                    {
                      'cursor-default': disableRowClick,
                    },
                  )}
                  onClick={() => {
                    if (disableRowClick) return
                    const link = getFilterLink(id, entryName)
                    if (link) {
                      navigate(link)
                      closeDetails()
                    }
                  }}
                >
                  <td className='flex items-center py-1 pl-2 text-left' style={{ width: '40%' }}>
                    <span
                      className={cx('scrollbar-thin hover-always-overflow flex items-center whitespace-nowrap', {
                        capitalize,
                      })}
                    >
                      {linkContent ? (
                        <a
                          className='scrollbar-thin hover-always-overflow whitespace-nowrap text-blue-600 hover:underline dark:text-blue-500'
                          href={rowData as string}
                          target='_blank'
                          rel='noopener noreferrer nofollow'
                          onClick={(e) => e.stopPropagation()}
                        >
                          {rowData}
                        </a>
                      ) : (
                        rowData
                      )}
                    </span>
                    {!disableRowClick ? (
                      <>
                        <FilterIcon
                          className='ml-2 hidden h-4 w-4 shrink-0 text-gray-500 group-hover:block dark:text-gray-300'
                          strokeWidth={1.5}
                        />
                        <div className='ml-2 h-4 w-4 group-hover:hidden' />
                      </>
                    ) : null}
                  </td>
                  {(() => {
                    const numericColsCount = 1 + (detailsExtraColumns?.length || 0) + (!hidePercentageInDetails ? 1 : 0)
                    const numericColWidth = `${(60 / numericColsCount).toFixed(3)}%`
                    return (
                      <td style={{ width: numericColWidth }} className='py-1 text-right'>
                        {activeTab === PROJECT_TABS.traffic ? nFormatter(valueData, 1) : valueData}
                        &nbsp;&nbsp;
                      </td>
                    )
                  })()}
                  {(() => {
                    const numericColsCount = 1 + (detailsExtraColumns?.length || 0) + (!hidePercentageInDetails ? 1 : 0)
                    const numericColWidth = `${(60 / numericColsCount).toFixed(3)}%`
                    return (
                      <>
                        {detailsExtraColumns?.map((col, idx) => (
                          <td
                            key={`extra-cell-${idx}`}
                            style={{ width: numericColWidth }}
                            className='py-1 pr-2 text-right'
                          >
                            {col.render(entry)}
                          </td>
                        ))}
                        {!hidePercentageInDetails ? (
                          <td style={{ width: numericColWidth }} className='py-1 pr-2 text-right'>
                            {perc}%
                          </td>
                        ) : null}
                      </>
                    )
                  })()}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const Panel = ({
  name,
  data,
  rowMapper = (row: Entry): React.ReactNode => row.name,
  valueMapper = (value: number): number => value,
  capitalize,
  linkContent,
  icon,
  id,
  hideFilters,
  getFilterLink = () => '',
  tabs,
  onTabChange,
  activeTabId,
  customRenderer,
  versionData,
  getVersionFilterLink = () => '',
  valuesHeaderName,
  highlightColour = 'blue',
  disableRowClick = false,
  hidePercentageInDetails,
  detailsExtraColumns,
}: PanelProps) => {
  const { dataLoading, activeTab } = useViewProjectContext()
  const { t } = useTranslation('common')
  const total = useMemo(() => _reduce(data, (prev, curr) => prev + curr.count, 0), [data])
  const [detailsOpened, setDetailsOpened] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string | null>>(new Set())

  const tnMapping = typeNameMapping(t)

  const entriesToDisplay = useMemo(() => {
    const orderedData = _orderBy(data, 'count', 'desc')
    return _slice(orderedData, 0, ENTRIES_PER_PANEL)
  }, [data])

  const toggleExpanded = (itemName: string | null) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(itemName)) {
        newSet.delete(itemName)
      } else {
        newSet.add(itemName)
      }
      return newSet
    })
  }

  const hasVersions = (itemName: string | null) => {
    if (itemName === null) return false
    return versionData && versionData[itemName] && versionData[itemName].length > 0
  }

  return (
    <PanelContainer
      onDetailsClick={_size(data) > ENTRIES_PER_PANEL ? () => setDetailsOpened(true) : undefined}
      name={name}
      icon={icon}
      type={id}
      tabs={tabs}
      onTabChange={onTabChange}
      activeTabId={activeTabId}
    >
      {customRenderer ? (
        customRenderer()
      ) : _isEmpty(data) ? (
        <p className='mt-1 text-base text-gray-700 dark:text-gray-300'>{t('project.noParamData')}</p>
      ) : (
        <>
          <div className='mb-1 flex items-center justify-between px-1 py-1'>
            <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
              {tnMapping[activeTabId as keyof typeof tnMapping]}
            </span>
            <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
              {valuesHeaderName || t('project.visitors')}
            </span>
          </div>

          <div className='space-y-0.5'>
            {_map(entriesToDisplay, (entry) => {
              const { count, name: entryName, ...rest } = entry
              const perc = _round((count / total) * 100, 2)
              const rowData = rowMapper(entry)
              const valueData = valueMapper(count)
              const hasVersionsForItem = hasVersions(entryName)
              const isExpanded = expandedItems.has(entryName)
              const versions = entryName ? versionData?.[entryName] || [] : []

              const link = getFilterLink(id, entryName)

              return (
                <div key={`${id}-${entryName}-${Object.values(rest).join('-')}`} className='space-y-0.5'>
                  <div
                    className={cx(
                      'relative flex items-center justify-between rounded-sm px-1 py-1.5 dark:text-gray-50',
                      {
                        'group hover:bg-gray-50 hover:dark:bg-slate-800':
                          !hideFilters && !dataLoading && (link || hasVersionsForItem),
                        'cursor-wait': dataLoading,
                      },
                    )}
                  >
                    <div
                      className={cx('absolute inset-0 rounded-sm', {
                        'bg-blue-50 dark:bg-blue-900/30': highlightColour === 'blue',
                        'bg-red-50 dark:bg-red-900/20': highlightColour === 'red',
                        'bg-orange-50 dark:bg-orange-400/20': highlightColour === 'orange',
                      })}
                      style={{ width: `${perc}%` }}
                    />

                    <div className='relative z-10 flex min-w-0 flex-1 items-center'>
                      {hasVersionsForItem ? (
                        <button
                          type='button'
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleExpanded(entryName)
                          }}
                          className='mr-1 rounded p-0.5 hover:bg-gray-200 dark:hover:bg-slate-600'
                          aria-label={isExpanded ? 'Collapse versions' : 'Expand versions'}
                        >
                          <ChevronRightIcon
                            className={cx('h-4 w-4 text-gray-500 transition-transform dark:text-gray-400', {
                              'rotate-90': isExpanded,
                            })}
                          />
                        </button>
                      ) : null}

                      <FilterWrapper
                        as={!disableRowClick && link ? 'Link' : 'div'}
                        to={link}
                        className={cx('flex min-w-0 flex-1 items-center', {
                          'cursor-pointer': !disableRowClick && !hideFilters && !dataLoading && link,
                          'cursor-wait': dataLoading,
                        })}
                      >
                        {linkContent ? (
                          <a
                            className={cx(
                              'scrollbar-thin hover-always-overflow flex items-center text-sm whitespace-nowrap text-blue-600 hover:underline dark:text-blue-500',
                              {
                                capitalize,
                              },
                            )}
                            href={rowData as string}
                            target='_blank'
                            rel='noopener noreferrer nofollow'
                            aria-label={`${rowData} (opens in a new tab)`}
                          >
                            {rowData}
                          </a>
                        ) : (
                          <span
                            className={cx(
                              'scrollbar-thin hover-always-overflow flex items-center text-sm whitespace-nowrap text-gray-900 dark:text-gray-100',
                              {
                                capitalize,
                              },
                            )}
                          >
                            {rowData}
                          </span>
                        )}
                      </FilterWrapper>
                    </div>
                    <div className='relative z-10 flex min-w-fit items-center justify-end pl-4'>
                      <span className='mr-2 hidden text-xs text-gray-500 group-hover:inline dark:text-gray-400'>
                        ({perc}%)
                      </span>
                      <span className='text-sm font-medium text-gray-900 dark:text-gray-50'>
                        {activeTab === PROJECT_TABS.traffic ? nFormatter(valueData, 1) : valueData}
                      </span>
                    </div>
                  </div>

                  {hasVersionsForItem && isExpanded ? (
                    <div className='ml-6 space-y-0.5'>
                      {_map(versions, (versionEntry) => {
                        const versionPerc = _round((versionEntry.count / total) * 100, 2)
                        const versionValueData = valueMapper(versionEntry.count)
                        const versionLink = disableRowClick
                          ? undefined
                          : getVersionFilterLink?.(entryName, versionEntry.name)

                        return (
                          <FilterWrapper
                            key={`${id}-${entryName}-${versionEntry.name}`}
                            as={!disableRowClick && versionLink ? 'Link' : 'div'}
                            to={versionLink}
                            className={cx(
                              'relative flex items-center justify-between rounded-sm px-1 py-1.5 dark:text-gray-50',
                              {
                                'group cursor-pointer hover:bg-gray-50 hover:dark:bg-slate-800':
                                  !disableRowClick && !hideFilters && !dataLoading && versionLink,
                                'cursor-wait': dataLoading,
                              },
                            )}
                          >
                            <div
                              className='absolute inset-0 rounded-sm bg-blue-50 dark:bg-blue-900/10'
                              style={{ width: `${versionPerc}%` }}
                            />

                            <div className='relative z-10 flex min-w-0 flex-1 items-center'>
                              <span
                                className={cx('flex items-center truncate text-sm text-gray-700 dark:text-gray-200', {
                                  capitalize,
                                })}
                              >
                                {rowMapper
                                  ? rowMapper({ ...entry, name: entryName, version: versionEntry.name })
                                  : `${entryName} ${versionEntry.name}`}
                              </span>
                            </div>
                            <div className='relative z-10 flex min-w-fit items-center justify-end pl-4'>
                              <span className='mr-2 hidden text-xs text-gray-500 group-hover:inline dark:text-gray-400'>
                                ({versionPerc}%)
                              </span>
                              <span className='text-sm font-medium text-gray-700 dark:text-gray-200'>
                                {activeTab === PROJECT_TABS.traffic
                                  ? nFormatter(versionValueData, 1)
                                  : versionValueData}
                              </span>
                            </div>
                          </FilterWrapper>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </>
      )}

      <Modal
        onClose={() => setDetailsOpened(false)}
        isOpened={detailsOpened}
        title={(() => {
          if (!activeTabId) return name as string
          const flatTabs: { id: string; label: string }[] = []
          ;(tabs || []).forEach((t) => {
            if (Array.isArray(t)) flatTabs.push(...t)
            else flatTabs.push(t)
          })
          const found = flatTabs.find((t) => t.id === activeTabId)
          return (
            found?.label || (tnMapping[activeTabId as keyof typeof tnMapping] as unknown as string) || (name as string)
          )
        })()}
        message={
          <DetailsTable
            id={id}
            total={total}
            valuesHeaderName={valuesHeaderName || ''}
            activeTabId={activeTabId || ''}
            closeDetails={() => setDetailsOpened(false)}
            data={data}
            rowMapper={rowMapper as (row: Entry) => string}
            valueMapper={valueMapper}
            capitalize={capitalize || false}
            linkContent={linkContent || false}
            getFilterLink={disableRowClick ? () => '' : (getFilterLink as (id: string, name: string | null) => string)}
            disableRowClick={disableRowClick}
            hidePercentageInDetails={hidePercentageInDetails}
            detailsExtraColumns={detailsExtraColumns}
          />
        }
        size='large'
      />
    </PanelContainer>
  )
}

interface AggregatedMetadata {
  key: string
  value: string
  count: number
}

interface MetadataPanelProps {
  metadata: AggregatedMetadata[]
}

const MetadataPanel = ({ metadata }: MetadataPanelProps) => {
  const { t } = useTranslation('common')
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<SortRows>({
    label: 'count',
    sortByAscend: false,
    sortByDescend: false,
  })

  const currentIndex = page * ENTRIES_PER_PANEL
  const totalPages = useMemo(() => _ceil(_size(metadata) / ENTRIES_PER_PANEL), [metadata])
  const canGoPrev = () => page > 0
  const canGoNext = () => page < _floor((_size(metadata) - 1) / ENTRIES_PER_PANEL)

  const sortedData = useMemo(() => {
    return [...metadata].sort((a, b) => {
      if (sort.label === 'count') {
        return sort.sortByAscend ? a.count - b.count : b.count - a.count
      }

      if (sort.label === 'value') {
        return sort.sortByAscend ? a.value.localeCompare(b.value) : b.value.localeCompare(a.value)
      }

      return sort.sortByAscend ? a.key.localeCompare(b.key) : b.key.localeCompare(a.key)
    })
  }, [metadata, sort])

  const metadataToDisplay = useMemo(
    () => _slice(sortedData, currentIndex, currentIndex + ENTRIES_PER_PANEL),
    [sortedData, currentIndex],
  )

  useEffect(() => {
    const sizeKeys = _size(metadata)

    if (currentIndex > sizeKeys) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset page when metadata size changes
      setPage(_floor(sizeKeys / ENTRIES_PER_PANEL))
    }
  }, [currentIndex, metadata])

  const onPrevious = () => {
    if (canGoPrev()) {
      setPage(page - 1)
    }
  }

  const onNext = () => {
    if (canGoNext()) {
      setPage(page + 1)
    }
  }

  const onSortBy = (label: string) => {
    if (sort.sortByAscend) {
      setSort({
        label,
        sortByAscend: false,
        sortByDescend: true,
      })
      return
    }

    if (sort.sortByDescend) {
      setSort({
        label,
        sortByAscend: false,
        sortByDescend: false,
      })
      return
    }

    setSort({
      label,
      sortByAscend: true,
      sortByDescend: false,
    })
  }

  if (_isEmpty(metadata)) {
    return null
  }

  return (
    <div className='col-span-full'>
      <PanelContainer name={t('project.metadata')} type='metadata'>
        <div className='overflow-y-auto'>
          <table className='w-full border-separate border-spacing-y-1'>
            <thead>
              <tr className='text-sm text-gray-900 dark:text-gray-50'>
                <th
                  className='flex w-2/5 cursor-pointer items-center pl-2 text-left hover:opacity-90 sm:w-4/6'
                  onClick={() => onSortBy('key')}
                >
                  {t('project.key')}
                  <Sort
                    className='ml-1'
                    sortByAscend={sort.label === 'key' ? sort.sortByAscend : null}
                    sortByDescend={sort.label === 'key' ? sort.sortByDescend : null}
                  />
                </th>
                <th className='w-[30%] sm:w-1/6'>
                  <p
                    className='flex cursor-pointer items-center justify-end hover:opacity-90'
                    onClick={() => onSortBy('value')}
                  >
                    {t('project.value')}
                    <Sort
                      className='ml-1'
                      sortByAscend={sort.label === 'value' ? sort.sortByAscend : null}
                      sortByDescend={sort.label === 'value' ? sort.sortByDescend : null}
                    />
                    &nbsp;&nbsp;
                  </p>
                </th>
                <th className='w-[30%] pr-2 sm:w-1/6'>
                  <p
                    className='flex cursor-pointer items-center justify-end hover:opacity-90'
                    onClick={() => onSortBy('count')}
                  >
                    {t('project.quantity')}
                    <Sort
                      className='ml-1'
                      sortByAscend={sort.label === 'count' ? sort.sortByAscend : null}
                      sortByDescend={sort.label === 'count' ? sort.sortByDescend : null}
                    />
                  </p>
                </th>
              </tr>
            </thead>
            <tbody>
              {_map(metadataToDisplay, ({ key, value, count }, index) => (
                <tr
                  key={`${key}-${value}-${count}-${index}`}
                  className='text-sm text-gray-900 even:bg-gray-50 hover:bg-gray-100 dark:text-gray-50 dark:even:bg-slate-800 hover:dark:bg-slate-700'
                >
                  <td className='py-1 pl-2 text-left'>{key}</td>
                  <td className='w-[30%] py-1 text-right sm:w-1/6'>
                    {value}
                    &nbsp;&nbsp;
                  </td>
                  <td className='w-[30%] py-1 pr-2 text-right sm:w-1/6'>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {_size(metadata) > ENTRIES_PER_PANEL ? (
          <div className='absolute bottom-0 w-[calc(100%-2rem)] sm:w-[calc(100%-3rem)]'>
            <div className='mb-2 flex justify-between select-none'>
              <div>
                <span className='text-xs font-light text-gray-500 lowercase dark:text-gray-200'>
                  {_size(metadata)} {t('project.results')}
                </span>
                <span className='text-xs font-light text-gray-500 dark:text-gray-200'>
                  . {t('project.page')} {page + 1} / {totalPages}
                </span>
              </div>
              <div className='flex w-[4.5rem] justify-between'>
                <Button
                  className={cx(
                    'border border-gray-300 px-1.5 py-0.5 font-light text-gray-500 dark:border-slate-800/50 dark:bg-slate-800 dark:text-gray-200',
                    {
                      'cursor-not-allowed opacity-50': !canGoPrev(),
                      'hover:bg-gray-100 hover:dark:bg-slate-700': canGoPrev(),
                    },
                  )}
                  type='button'
                  onClick={onPrevious}
                  disabled={!canGoPrev()}
                  focus={false}
                >
                  <ArrowLongLeftIcon className='h-5 w-5' />
                </Button>
                <Button
                  className={cx(
                    'border border-gray-300 px-1.5 py-0.5 font-light text-gray-500 dark:border-slate-800/50 dark:bg-slate-800 dark:text-gray-200',
                    {
                      'cursor-not-allowed opacity-50': !canGoNext(),
                      'hover:bg-gray-100 hover:dark:bg-slate-700': canGoNext(),
                    },
                  )}
                  onClick={onNext}
                  disabled={!canGoNext()}
                  type='button'
                  focus={false}
                >
                  <ArrowLongRightIcon className='h-5 w-5' />
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </PanelContainer>
    </div>
  )
}

const PanelMemo = memo(Panel) as typeof Panel
const MetadataMemo = memo(Metadata) as typeof Metadata
const MetadataPanelMemo = memo(MetadataPanel) as typeof MetadataPanel

export { PanelMemo as Panel, MetadataMemo as Metadata, MetadataPanelMemo as MetadataPanel }
