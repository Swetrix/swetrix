import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/20/solid'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import { ArrowLongRightIcon, ArrowLongLeftIcon } from '@heroicons/react/24/solid'
import cx from 'clsx'
import InnerHTML from 'dangerously-set-html-content'
import _ceil from 'lodash/ceil'
import _find from 'lodash/find'
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
import { MaximizeIcon, FilterIcon, PuzzleIcon, ScanIcon } from 'lucide-react'
import React, { memo, useState, useEffect, useMemo, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, LinkProps, useNavigate } from 'react-router'

import { PROJECT_TABS } from '~/lib/constants'
import { Entry } from '~/lib/models/Entry'
import Button from '~/ui/Button'
import Sort from '~/ui/icons/Sort'
import Spin from '~/ui/icons/Spin'
import Modal from '~/ui/Modal'
import { nFormatter } from '~/utils/generic'

import CustomEventsDropdown from './components/CustomEventsDropdown'
import { Customs, Filter, Properties } from './interfaces/traffic'
import { useViewProjectContext } from './ViewProject'
import { iconClassName, typeNameMapping } from './ViewProject.helpers'

const ENTRIES_PER_PANEL = 8
const ENTRIES_PER_CUSTOM_EVENTS_PANEL = 8

// function that checks if there are custom tabs for a specific type
const checkCustomTabs = (panelID: string, customTabs: CustomTab[]) => {
  if (_isEmpty(customTabs)) return false

  return Boolean(_find(customTabs, (el) => el.panelID === panelID))
}

const removeDuplicates = (arr: any[], keys: string[]) => {
  const uniqueObjects: any[] = []

  const isDuplicate = (obj: any) => {
    for (const uniqueObj of uniqueObjects) {
      let isMatch = true

      for (const key of keys) {
        if (uniqueObj[key] !== obj[key]) {
          isMatch = false
          break
        }
      }
      if (isMatch) {
        return true
      }
    }
    return false
  }

  for (const obj of arr) {
    if (!isDuplicate(obj)) {
      uniqueObjects.push(obj)
    }
  }

  return uniqueObjects
}

interface PanelContainerProps {
  name: React.ReactNode
  children?: React.ReactNode
  icon?: React.ReactNode
  type: string
  onExpandClick?: () => void
  activeFragment?: number | string
  setActiveFragment?: (arg: number) => void
  customTabs?: CustomTab[]
  isCustomContent?: boolean
  tabs?: Array<{
    id: string
    label: string
    hasData?: boolean
  }>
  onTabChange?: (tab: string) => void
  activeTabId?: string
}

const PanelContainer = ({
  name,
  children,
  icon,
  type,
  activeFragment = 0,
  setActiveFragment = () => {},
  customTabs = [],
  isCustomContent,
  onExpandClick = () => {},
  tabs,
  onTabChange,
  activeTabId,
}: PanelContainerProps) => (
  <div
    className={cx(
      'h-[26rem] overflow-hidden rounded-lg border border-gray-300 bg-white px-4 py-5 dark:border-slate-800/60 dark:bg-slate-800/25',
      {
        'col-span-2': type === 'ce',
      },
    )}
  >
    <div className='mb-2 flex items-center justify-between gap-4'>
      <h3 className='flex items-center text-lg leading-6 font-semibold whitespace-nowrap text-gray-900 dark:text-gray-50'>
        {icon ? <span className='mr-1'>{icon}</span> : null}
        {name}
      </h3>
      <div className='scrollbar-thin flex items-center gap-1 overflow-x-auto'>
        {tabs && onTabChange ? (
          <>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type='button'
                onClick={() => {
                  onTabChange(tab.id)
                  setActiveFragment(0)
                }}
                disabled={tab.hasData === false}
                className={cx(
                  'relative border-b-2 px-1.5 py-1 text-sm font-bold whitespace-nowrap transition-all duration-200',
                  {
                    'border-slate-900 text-slate-900 dark:border-gray-50 dark:text-gray-50':
                      activeTabId === tab.id && activeFragment === 0,
                    'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-300 dark:hover:text-gray-300':
                      (activeTabId !== tab.id || activeFragment !== 0) && tab.hasData !== false,
                    'cursor-not-allowed border-transparent text-gray-300 dark:text-gray-600': tab.hasData === false,
                  },
                )}
              >
                {tab.label}
              </button>
            ))}
          </>
        ) : (
          <>
            {/* if it is a 'Custom events' tab  */}
            {type === 'ce' || type === 'props' ? (
              <>
                <button
                  type='button'
                  onClick={onExpandClick}
                  aria-label='Expand view'
                  className='ml-1 rounded-md p-1 hover:bg-gray-50 dark:hover:bg-slate-700'
                >
                  <MaximizeIcon className={cx(iconClassName, 'text-slate-400 dark:text-slate-500')} strokeWidth={1.5} />
                </button>
              </>
            ) : null}

            {checkCustomTabs(type, customTabs) ? (
              <>
                {/* This is a temp fix to prevent multiple tabs of the same extensionID be displayed */}
                {/* TODO: Investigate the issue and fix it */}
                {_map(removeDuplicates(customTabs, ['extensionID', 'panelID']), ({ extensionID, panelID, onOpen }) => {
                  if (panelID !== type) return null

                  const onClick = () => {
                    onOpen?.()
                    setActiveFragment(extensionID)
                  }

                  return (
                    <button
                      type='button'
                      key={`${extensionID}-${panelID}`}
                      onClick={onClick}
                      aria-label='Switch to custom tab'
                      className='ml-1 rounded-md p-1 hover:bg-gray-50 dark:hover:bg-slate-700'
                    >
                      <PuzzleIcon
                        className={cx(iconClassName, {
                          'text-slate-900 dark:text-gray-50': activeFragment === extensionID,
                          'text-slate-400 dark:text-slate-500': activeFragment === 0,
                        })}
                        strokeWidth={1.5}
                      />
                    </button>
                  )
                })}
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
    {/* for other tabs */}
    <div
      className={cx('flex h-full flex-col overflow-x-auto', {
        relative: isCustomContent,
      })}
    >
      {children}
    </div>
  </div>
)

export type CustomTab = {
  extensionID: string
  panelID: string
  onOpen?: () => void
  tabContent?: string
}

interface MetadataProps {
  customs: Customs
  properties: Properties
  chartData: any
  filters: Filter[]
  getCustomEventMetadata: (event: string) => Promise<any>
  getPropertyMetadata: (property: string) => Promise<any>
  customTabs: CustomTab[]
  getFilterLink: (column: string, value: string) => LinkProps['to']
}

interface CustomEventsProps extends MetadataProps {
  setActiveTab: React.Dispatch<React.SetStateAction<'customEv' | 'properties'>>
  dataKeys: {
    properties: string[]
    customEv: string[]
  }
}

interface PagePropertiesProps extends MetadataProps {
  setActiveTab: React.Dispatch<React.SetStateAction<'customEv' | 'properties'>>
  dataKeys: {
    properties: string[]
    customEv: string[]
  }
}

interface SortRows {
  label: string
  sortByAscend: boolean
  sortByDescend: boolean
}

interface KVTableContainerProps {
  data: any
  uniques: number
  onClick: (key: string, value: string) => void
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
            className='group cursor-pointer py-3 text-gray-900 even:bg-gray-50 hover:bg-gray-100 dark:text-gray-50 dark:even:bg-slate-800 hover:dark:bg-slate-700'
          >
            <td className='flex items-center py-1 pl-2 text-left'>
              {event}
              <FilterIcon
                className='ml-2 hidden h-4 w-4 text-gray-500 group-hover:block dark:text-gray-300'
                strokeWidth={1.5}
              />
              <div className='ml-2 h-4 w-4 group-hover:hidden' />
            </td>
            <td className='py-1 text-right'>
              {quantity}
              &nbsp;&nbsp;
            </td>
            <td className='py-1 pr-2 text-right'>{conversion}%</td>
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
    return <p className='mb-2 text-gray-600 dark:text-gray-200'>{t('project.noData')}</p>
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

const CustomEvents = ({
  customs,
  chartData,
  filters,
  customTabs = [],
  getCustomEventMetadata,
  setActiveTab,
  getFilterLink,
  dataKeys,
}: CustomEventsProps) => {
  const { t } = useTranslation('common')
  const [page, setPage] = useState(0)
  const [detailsOpened, setDetailsOpened] = useState(false)
  const [activeEvents, setActiveEvents] = useState<any>({})
  const [loadingEvents, setLoadingEvents] = useState<any>({})
  const [eventsMetadata, setEventsMetadata] = useState<any>({})
  const [customsEventsData, setCustomsEventsData] = useState<any>(customs)
  const [triggerEventWhenFiltersChange, setTriggerEventWhenFiltersChange] = useState<string | null>(null)
  const currentIndex = page * ENTRIES_PER_CUSTOM_EVENTS_PANEL
  const keys = _keys(customsEventsData)
  const keysToDisplay = useMemo(
    () => _slice(keys, currentIndex, currentIndex + ENTRIES_PER_CUSTOM_EVENTS_PANEL),
    [keys, currentIndex],
  )
  const uniques = _sum(chartData.uniques)
  const [activeFragment, setActiveFragment] = useState(0)
  const totalPages = useMemo(() => _ceil(_size(keys) / ENTRIES_PER_CUSTOM_EVENTS_PANEL), [keys])
  const canGoPrev = () => page > 0
  const canGoNext = () => page < _floor((_size(keys) - 1) / ENTRIES_PER_CUSTOM_EVENTS_PANEL)
  const [sort, setSort] = useState<SortRows>({
    label: 'quantity',
    sortByAscend: false,
    sortByDescend: false,
  })
  const navigate = useNavigate()

  useEffect(() => {
    const sizeKeys = _size(keys)

    if (currentIndex > sizeKeys) {
      setPage(_floor(sizeKeys / ENTRIES_PER_CUSTOM_EVENTS_PANEL))
    }
  }, [currentIndex, keys])

  useEffect(() => {
    setCustomsEventsData(customs)
    setSort({
      label: 'quantity',
      sortByAscend: false,
      sortByDescend: false,
    })
  }, [customs])

  useEffect(() => {
    setPage(0)
  }, [chartData])

  useEffect(() => {
    if (!triggerEventWhenFiltersChange) {
      return
    }

    toggleEventMetadata(triggerEventWhenFiltersChange)()
    setTriggerEventWhenFiltersChange(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, triggerEventWhenFiltersChange])

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

  // is "e" is not set, then details loading is forced and all checks are skipped
  const toggleEventMetadata = (ev: string) => async (e?: React.MouseEvent<HTMLTableRowElement>) => {
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
        const { result } = await getCustomEventMetadata(ev)
        setEventsMetadata((metadata: any) => ({
          ...metadata,
          [ev]: result,
        }))
      } catch (reason) {
        console.error(`[ERROR](toggleEventMetadata) Failed to get metadata for event ${ev}`, reason)
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
      setCustomsEventsData(sortDesc(customsEventsData, sortByKeys))
      setSort({
        label,
        sortByAscend: false,
        sortByDescend: true,
      })
      return
    }

    if (sort.sortByDescend) {
      setCustomsEventsData(customs)
      setSort({
        label,
        sortByAscend: false,
        sortByDescend: false,
      })
      return
    }

    setCustomsEventsData(sortAsc(customsEventsData, sortByKeys))
    setSort({
      label,
      sortByAscend: true,
      sortByDescend: false,
    })
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
              {t('project.event')}
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
          {_map(keysToDisplay, (ev) => (
            <Fragment key={ev}>
              <tr
                className={cx(
                  'group cursor-pointer text-base text-gray-900 even:bg-gray-50 hover:bg-gray-100 dark:text-gray-50 dark:even:bg-slate-800 hover:dark:bg-slate-700',
                  {
                    'animate-pulse bg-gray-100 dark:bg-slate-700': loadingEvents[ev],
                  },
                )}
                onClick={toggleEventMetadata(ev)}
              >
                <td className='flex items-center py-1 text-left'>
                  {loadingEvents[ev] ? (
                    <Spin className='mr-2 ml-1' />
                  ) : activeEvents[ev] ? (
                    <ChevronUpIcon className='h-5 w-auto pr-2 pl-1 text-gray-500 hover:opacity-80 dark:text-gray-300' />
                  ) : (
                    <ChevronDownIcon className='h-5 w-auto pr-2 pl-1 text-gray-500 hover:opacity-80 dark:text-gray-300' />
                  )}
                  {ev}
                </td>
                <td className='py-1 text-right'>
                  {customsEventsData[ev]}
                  &nbsp;&nbsp;
                </td>
                <td className='py-1 pr-2 text-right'>
                  {uniques === 0 ? 100 : _round((customsEventsData[ev] / uniques) * 100, 2)}%
                </td>
              </tr>
              {activeEvents[ev] && !loadingEvents[ev] ? (
                <tr>
                  <td className='pl-9' colSpan={3}>
                    <KVTableContainer
                      data={eventsMetadata[ev]}
                      uniques={uniques}
                      onClick={async (key, value) => {
                        const link = getFilterLink(`ev:key:${key}`, value)
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

  if (_isEmpty(customs)) {
    return (
      <PanelContainer
        // @ts-expect-error - onSelect not typed
        name={<CustomEventsDropdown onSelect={setActiveTab} title={t('project.customEv')} data={dataKeys} />}
        type='ce'
        setActiveFragment={setActiveFragment}
        activeFragment={activeFragment}
        onExpandClick={() => setDetailsOpened(true)}
      >
        <p className='mt-1 text-base text-gray-700 dark:text-gray-300'>{t('project.noParamData')}</p>
      </PanelContainer>
    )
  }

  // Showing custom tabs (Extensions Marketplace)
  // todo: check activeFragment for being equal to customTabs -> extensionID + panelID
  if (!_isEmpty(customTabs) && typeof activeFragment === 'string') {
    const { tabContent } = _find(customTabs, (tab) => tab.extensionID === activeFragment) || ({} as CustomTab)

    return (
      <PanelContainer
        // @ts-expect-error - onSelect not typed
        name={<CustomEventsDropdown onSelect={setActiveTab} title={t('project.customEv')} data={dataKeys} />}
        type='ce'
        activeFragment={activeFragment}
        setActiveFragment={setActiveFragment}
        customTabs={customTabs}
        onExpandClick={() => {}}
        isCustomContent
      >
        {/* Using this instead of dangerouslySetInnerHTML to support script tags */}
        {tabContent ? <InnerHTML className='absolute overflow-auto' html={tabContent} /> : null}
      </PanelContainer>
    )
  }

  return (
    <PanelContainer
      customTabs={customTabs}
      // @ts-expect-error - onSelect not typed
      name={<CustomEventsDropdown onSelect={setActiveTab} title={t('project.customEv')} data={dataKeys} />}
      type='ce'
      setActiveFragment={setActiveFragment}
      activeFragment={activeFragment}
      onExpandClick={() => setDetailsOpened(true)}
    >
      <table className='table-fixed'>
        <thead>
          <tr className='text-gray-900 dark:text-gray-50'>
            <th
              className='flex w-4/6 cursor-pointer items-center text-left hover:opacity-90'
              onClick={() => onSortBy('event')}
            >
              {t('project.event')}
              <Sort
                className='ml-1'
                sortByAscend={sort.label === 'event' ? sort.sortByAscend : null}
                sortByDescend={sort.label === 'event' ? sort.sortByDescend : null}
              />
            </th>
            <th className='w-1/6 text-right'>
              <p className='flex cursor-pointer items-center hover:opacity-90' onClick={() => onSortBy('quantity')}>
                {t('project.quantity')}
                <Sort
                  className='ml-1'
                  sortByAscend={sort.label === 'quantity' ? sort.sortByAscend : null}
                  sortByDescend={sort.label === 'quantity' ? sort.sortByDescend : null}
                />
                &nbsp;&nbsp;
              </p>
            </th>
            <th className='w-1/6 text-right'>
              <p className='flex cursor-pointer items-center hover:opacity-90' onClick={() => onSortBy('conversion')}>
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
          {_map(keysToDisplay, (ev) => (
            <tr
              key={ev}
              className='group cursor-pointer text-gray-900 hover:bg-gray-100 dark:text-gray-50 hover:dark:bg-slate-700'
              onClick={() => {
                const link = getFilterLink('ev', ev)
                navigate(link)
              }}
            >
              <td className='flex items-center text-left'>
                {ev}
                <FilterIcon
                  className='ml-2 hidden h-4 w-4 text-gray-500 group-hover:block dark:text-gray-300'
                  strokeWidth={1.5}
                />
                <div className='ml-2 h-4 w-4 group-hover:hidden' />
              </td>
              <td className='text-right'>
                {customsEventsData[ev]}
                &nbsp;&nbsp;
              </td>
              <td className='text-right'>
                {/*
                  Added a uniques === 0 check because uniques value may be zero and dividing by zero will cause an
                  Infinity% value to be displayed.
                */}
                {uniques === 0 ? 100 : _round((customsEventsData[ev] / uniques) * 100, 2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* for pagination in tabs */}
      {_size(keys) > ENTRIES_PER_CUSTOM_EVENTS_PANEL ? (
        <div className='absolute bottom-0 w-[calc(100%-2rem)] sm:w-[calc(100%-3rem)]'>
          <div className='mb-2 flex justify-between select-none'>
            <div>
              <span className='text-xs font-light text-gray-500 lowercase dark:text-gray-200'>
                {_size(keys)} {t('project.results')}
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
      <Modal
        onClose={onModalClose}
        isOpened={detailsOpened}
        title={t('project.customEv')}
        message={<CustomEventsTable />}
        size='large'
      />
    </PanelContainer>
  )
}

const PageProperties = ({
  properties,
  chartData,
  filters,
  getPropertyMetadata,
  setActiveTab,
  getFilterLink,
  dataKeys,
}: PagePropertiesProps) => {
  const { t } = useTranslation('common')
  const [page, setPage] = useState(0)
  const [detailsOpened, setDetailsOpened] = useState(false)
  const [activeProperties, setActiveProperties] = useState<any>({})
  const [loadingDetails, setLoadingDetails] = useState<any>({})
  const [details, setDetails] = useState<any>({})
  const [processedProperties, setProcessedProperties] = useState<Properties>(properties)
  const currentIndex = page * ENTRIES_PER_CUSTOM_EVENTS_PANEL
  const keys = _keys(processedProperties)
  const keysToDisplay = useMemo(
    () => _slice(keys, currentIndex, currentIndex + ENTRIES_PER_CUSTOM_EVENTS_PANEL),
    [keys, currentIndex],
  )
  const uniques = _sum(chartData.uniques)
  const [activeFragment, setActiveFragment] = useState(0)
  const [triggerTagWhenFiltersChange, setTriggerTagWhenFiltersChange] = useState<string | null>(null)
  const totalPages = useMemo(() => _ceil(_size(keys) / ENTRIES_PER_CUSTOM_EVENTS_PANEL), [keys])
  const canGoPrev = () => page > 0
  const canGoNext = () => page < _floor((_size(keys) - 1) / ENTRIES_PER_CUSTOM_EVENTS_PANEL)
  const [sort, setSort] = useState<SortRows>({
    label: 'quantity',
    sortByAscend: false,
    sortByDescend: false,
  })
  const navigate = useNavigate()

  useEffect(() => {
    const sizeKeys = _size(keys)

    if (currentIndex > sizeKeys) {
      setPage(_floor(sizeKeys / ENTRIES_PER_CUSTOM_EVENTS_PANEL))
    }
  }, [currentIndex, keys])

  useEffect(() => {
    setProcessedProperties(properties)
    setSort({
      label: 'quantity',
      sortByAscend: false,
      sortByDescend: false,
    })
  }, [properties])

  useEffect(() => {
    setPage(0)
  }, [chartData])

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

  useEffect(() => {
    if (!triggerTagWhenFiltersChange) {
      return
    }

    togglePropertyDetails(triggerTagWhenFiltersChange)()
    setTriggerTagWhenFiltersChange(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, triggerTagWhenFiltersChange])

  // is "e" is not set, then details loading is forced and all checks are skipped
  const togglePropertyDetails = (property: string) => async (e?: React.MouseEvent<HTMLTableRowElement>) => {
    if (e) {
      e.stopPropagation()

      setActiveProperties((events: any) => ({
        ...events,
        [property]: !events[property],
      }))
    }

    if (!e || !details[property]) {
      setLoadingDetails((events: any) => ({
        ...events,
        [property]: true,
      }))

      try {
        const { result } = await getPropertyMetadata(property)
        setDetails((metadata: any) => ({
          ...metadata,
          [property]: result,
        }))
      } catch (reason) {
        console.error(`[ERROR](togglePropertyDetails) Failed to get metadata for property ${property}`, reason)
        setDetails((metadata: any) => ({
          ...metadata,
          [property]: [],
        }))
      }

      setLoadingDetails((events: any) => ({
        ...events,
        [property]: false,
      }))
    }
  }

  const onModalClose = () => {
    setDetailsOpened(false)

    // a timeout is needed to prevent the flicker of data fields in the modal when closing
    setTimeout(() => {
      setActiveProperties({})
      setDetails({})
    }, 300)
  }

  const onSortBy = (label: string) => {
    const sortByKeys = label === 'event'

    if (sort.sortByAscend) {
      setProcessedProperties(sortDesc(processedProperties, sortByKeys))
      setSort({
        label,
        sortByAscend: false,
        sortByDescend: true,
      })
      return
    }

    if (sort.sortByDescend) {
      setProcessedProperties(properties)
      setSort({
        label,
        sortByAscend: false,
        sortByDescend: false,
      })
      return
    }

    setProcessedProperties(sortAsc(processedProperties, sortByKeys))
    setSort({
      label,
      sortByAscend: true,
      sortByDescend: false,
    })
  }

  const PropertiesTable = () => (
    <div className='overflow-y-auto'>
      <table className='w-full border-separate border-spacing-y-1'>
        <thead>
          <tr className='text-base text-gray-900 dark:text-gray-50'>
            <th
              className='flex w-2/5 cursor-pointer items-center pl-2 text-left hover:opacity-90 sm:w-4/6'
              onClick={() => onSortBy('event')}
            >
              {t('project.property')}
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
          {_map(keysToDisplay, (tag) => (
            <Fragment key={tag}>
              <tr
                className={cx(
                  'group cursor-pointer text-base text-gray-900 even:bg-gray-50 hover:bg-gray-100 dark:text-gray-50 dark:even:bg-slate-800 hover:dark:bg-slate-700',
                  {
                    'animate-pulse bg-gray-100 dark:bg-slate-700': loadingDetails[tag],
                  },
                )}
                onClick={togglePropertyDetails(tag)}
              >
                <td className='flex items-center py-1 text-left'>
                  {loadingDetails[tag] ? (
                    <Spin className='mr-2 ml-1' />
                  ) : activeProperties[tag] ? (
                    <ChevronUpIcon className='h-5 w-auto pr-2 pl-1 text-gray-500 hover:opacity-80 dark:text-gray-300' />
                  ) : (
                    <ChevronDownIcon className='h-5 w-auto pr-2 pl-1 text-gray-500 hover:opacity-80 dark:text-gray-300' />
                  )}
                  {tag}
                </td>
                <td className='py-1 text-right'>
                  {processedProperties[tag]}
                  &nbsp;&nbsp;
                </td>
                <td className='py-1 pr-2 text-right'>
                  {uniques === 0 ? 100 : _round((processedProperties[tag] / uniques) * 100, 2)}%
                </td>
              </tr>
              {activeProperties[tag] && !loadingDetails[tag] ? (
                <tr>
                  <td className='pl-9' colSpan={3}>
                    <KVTableContainer
                      data={details[tag]}
                      uniques={uniques}
                      onClick={async (key, value) => {
                        const link = getFilterLink(`tag:key:${key}`, value)
                        navigate(link)
                        setTriggerTagWhenFiltersChange(tag)
                      }}
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

  if (_isEmpty(properties)) {
    return (
      <PanelContainer
        // @ts-expect-error - onSelect not typed
        name={<CustomEventsDropdown onSelect={setActiveTab} title={t('project.properties')} data={dataKeys} />}
        type='props'
        setActiveFragment={setActiveFragment}
        activeFragment={activeFragment}
        onExpandClick={() => setDetailsOpened(true)}
      >
        <p className='mt-1 text-base text-gray-700 dark:text-gray-300'>{t('project.noParamData')}</p>
      </PanelContainer>
    )
  }

  return (
    <PanelContainer
      // @ts-expect-error - onSelect not typed
      name={<CustomEventsDropdown onSelect={setActiveTab} title={t('project.properties')} data={dataKeys} />}
      type='props'
      setActiveFragment={setActiveFragment}
      activeFragment={activeFragment}
      onExpandClick={() => setDetailsOpened(true)}
    >
      <table className='table-fixed'>
        <thead>
          <tr className='text-gray-900 dark:text-gray-50'>
            <th
              className='flex w-4/6 cursor-pointer items-center text-left hover:opacity-90'
              onClick={() => onSortBy('event')}
            >
              {t('project.property')}
              <Sort
                className='ml-1'
                sortByAscend={sort.label === 'event' ? sort.sortByAscend : null}
                sortByDescend={sort.label === 'event' ? sort.sortByDescend : null}
              />
            </th>
            <th className='w-1/6 text-right'>
              <p className='flex cursor-pointer items-center hover:opacity-90' onClick={() => onSortBy('quantity')}>
                {t('project.quantity')}
                <Sort
                  className='ml-1'
                  sortByAscend={sort.label === 'quantity' ? sort.sortByAscend : null}
                  sortByDescend={sort.label === 'quantity' ? sort.sortByDescend : null}
                />
                &nbsp;&nbsp;
              </p>
            </th>
            <th className='w-1/6 text-right'>
              <p className='flex cursor-pointer items-center hover:opacity-90' onClick={() => onSortBy('conversion')}>
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
          {_map(keysToDisplay, (tag) => (
            <tr
              key={tag}
              className='group cursor-pointer text-gray-900 hover:bg-gray-100 dark:text-gray-50 hover:dark:bg-slate-700'
              onClick={() => {
                const link = getFilterLink('tag:key', tag)
                navigate(link)
              }}
            >
              <td className='flex items-center text-left'>
                {tag}
                <FilterIcon
                  className='ml-2 hidden h-4 w-4 text-gray-500 group-hover:block dark:text-gray-300'
                  strokeWidth={1.5}
                />
                <div className='ml-2 h-4 w-4 group-hover:hidden' />
              </td>
              <td className='text-right'>
                {processedProperties[tag]}
                &nbsp;&nbsp;
              </td>
              <td className='text-right'>
                {/*
                  Added a uniques === 0 check because uniques value may be zero and dividing by zero will cause an
                  Infinity% value to be displayed.
                */}
                {uniques === 0 ? 100 : _round((processedProperties[tag] / uniques) * 100, 2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* for pagination in tabs */}
      {_size(keys) > ENTRIES_PER_CUSTOM_EVENTS_PANEL ? (
        <div className='absolute bottom-0 w-[calc(100%-2rem)] sm:w-[calc(100%-3rem)]'>
          <div className='mb-2 flex justify-between select-none'>
            <div>
              <span className='text-xs font-light text-gray-500 lowercase dark:text-gray-200'>
                {_size(keys)} {t('project.results')}
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
      <Modal
        onClose={onModalClose}
        isOpened={detailsOpened}
        title={t('project.properties')}
        message={<PropertiesTable />}
        size='large'
      />
    </PanelContainer>
  )
}

const Metadata = (props: MetadataProps) => {
  const [activeTab, setActiveTab] = useState<'customEv' | 'properties'>('customEv')

  const dataKeys = useMemo(() => {
    return {
      properties: Object.keys(props.properties || {}),
      customEv: Object.keys(props.customs || {}),
    }
  }, [props.properties, props.customs])

  if (activeTab === 'customEv') {
    return <CustomEvents {...props} dataKeys={dataKeys} setActiveTab={setActiveTab} />
  }

  return <PageProperties {...props} dataKeys={dataKeys} setActiveTab={setActiveTab} />
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
  name: React.ReactNode
  data: Entry[]
  rowMapper?: (row: any) => React.ReactNode
  valueMapper?: (value: number) => number
  capitalize?: boolean
  linkContent?: boolean
  icon: any
  id: string
  hideFilters?: boolean
  customTabs?: CustomTab[]
  onFragmentChange?: (arg: number) => void
  getFilterLink?: (column: string, value: string) => LinkProps['to']
  tabs?: Array<{
    id: string
    label: string
    hasData?: boolean
  }>
  onTabChange?: (tab: string) => void
  activeTabId?: string
  customRenderer?: () => React.ReactNode
  versionData?: { [key: string]: Entry[] }
  getVersionFilterLink?: (parent: string, version: string) => LinkProps['to']
}

const Panel = ({
  name,
  data,
  rowMapper = (row: Entry): string => row.name,
  valueMapper = (value: number): number => value,
  capitalize,
  linkContent,
  icon,
  id,
  hideFilters,
  customTabs = [],
  onFragmentChange = () => {},
  getFilterLink = () => '',
  tabs,
  onTabChange,
  activeTabId,
  customRenderer,
  versionData,
  getVersionFilterLink = () => '',
}: PanelProps) => {
  const { dataLoading, activeTab } = useViewProjectContext()
  const { t } = useTranslation('common')
  const total = useMemo(() => _reduce(data, (prev, curr) => prev + curr.count, 0), [data])
  const [activeFragment, setActiveFragment] = useState(0)
  const [detailsOpened, setDetailsOpened] = useState(false)
  const [sortedData, setSortedData] = useState(data)
  const [sort, setSort] = useState<SortRows>({
    label: 'quantity',
    sortByAscend: false,
    sortByDescend: false,
  })
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const navigate = useNavigate()

  const tnMapping = typeNameMapping(t)

  const entriesToDisplay = useMemo(() => {
    const orderedData = _orderBy(data, 'count', 'desc')
    return _slice(orderedData, 0, ENTRIES_PER_PANEL)
  }, [data])

  const toggleExpanded = (itemName: string) => {
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

  const hasVersions = (itemName: string) => {
    return versionData && versionData[itemName] && versionData[itemName].length > 0
  }

  useEffect(() => {
    setSortedData(data)
    setSort({
      label: 'quantity',
      sortByAscend: false,
      sortByDescend: false,
    })
  }, [data])

  const _setActiveFragment = (index: number) => {
    setActiveFragment(index)

    if (onFragmentChange) {
      onFragmentChange(index)
    }
  }

  const onSortBy = (label: string) => {
    if (sort.sortByAscend) {
      const newData = [...sortedData].sort((a, b) => {
        if (label === 'quantity') return a.count - b.count
        return b.name.localeCompare(a.name)
      })
      setSortedData(newData)
      setSort({
        label,
        sortByAscend: false,
        sortByDescend: true,
      })
      return
    }

    if (sort.sortByDescend) {
      setSortedData([...data])
      setSort({
        label,
        sortByAscend: false,
        sortByDescend: false,
      })
      return
    }

    const newData = [...sortedData].sort((a, b) => {
      if (label === 'quantity') return b.count - a.count
      return a.name.localeCompare(b.name)
    })
    setSortedData(newData)
    setSort({
      label,
      sortByAscend: true,
      sortByDescend: false,
    })
  }

  const DetailsTable = () => (
    <div className='max-h-[500px] overflow-y-auto'>
      <table className='w-full border-separate border-spacing-y-1'>
        <thead className='sticky top-0 z-10 bg-white dark:bg-slate-900'>
          <tr className='text-base text-gray-900 dark:text-gray-50'>
            <th
              className='flex w-2/5 cursor-pointer items-center pl-2 text-left hover:opacity-90 sm:w-4/6'
              onClick={() => onSortBy('name')}
            >
              {tnMapping[activeTabId as keyof typeof tnMapping]}
              <Sort
                className='ml-1'
                sortByAscend={sort.label === 'name' ? sort.sortByAscend : null}
                sortByDescend={sort.label === 'name' ? sort.sortByDescend : null}
              />
            </th>
            <th className='w-[30%] sm:w-1/6'>
              <p
                className='flex cursor-pointer items-center justify-end hover:opacity-90'
                onClick={() => onSortBy('quantity')}
              >
                {t('project.visitors')}
                <Sort
                  className='ml-1'
                  sortByAscend={sort.label === 'quantity' ? sort.sortByAscend : null}
                  sortByDescend={sort.label === 'quantity' ? sort.sortByDescend : null}
                />
                &nbsp;&nbsp;
              </p>
            </th>
            <th className='w-[30%] pr-2 sm:w-1/6'>
              <p className='flex items-center justify-end'>{t('project.percentage')}</p>
            </th>
          </tr>
        </thead>
        <tbody>
          {_map(sortedData, (entry) => {
            const { count, name: entryName, ...rest } = entry
            const perc = _round((count / total) * 100, 2)
            const rowData = rowMapper(entry)
            const valueData = valueMapper(count)

            return (
              <tr
                key={`${id}-${entryName}-${Object.values(rest).join('-')}`}
                className='group cursor-pointer text-base text-gray-900 even:bg-gray-50 hover:bg-gray-100 dark:text-gray-50 dark:even:bg-slate-800 hover:dark:bg-slate-700'
                onClick={() => {
                  const link = getFilterLink(id, entryName)
                  if (link) {
                    navigate(link)
                    setDetailsOpened(false)
                  }
                }}
              >
                <td className='flex items-center py-1 pl-2 text-left'>
                  <span
                    className={cx('flex items-center truncate', {
                      capitalize,
                    })}
                  >
                    {linkContent ? (
                      <a
                        className='text-blue-600 hover:underline dark:text-blue-500'
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
                  <FilterIcon
                    className='ml-2 hidden h-4 w-4 text-gray-500 group-hover:block dark:text-gray-300'
                    strokeWidth={1.5}
                  />
                  <div className='ml-2 h-4 w-4 group-hover:hidden' />
                </td>
                <td className='py-1 text-right'>
                  {activeTab === PROJECT_TABS.traffic ? nFormatter(valueData, 1) : valueData}
                  &nbsp;&nbsp;
                </td>
                <td className='py-1 pr-2 text-right'>{perc}%</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  // Showing custom tabs (Extensions Marketplace)
  // todo: check activeFragment for being equal to customTabs -> extensionID + panelID
  if (!_isEmpty(customTabs) && typeof activeFragment === 'string' && !_isEmpty(data)) {
    const { tabContent } = _find(customTabs, (tab) => tab.extensionID === activeFragment) || ({} as CustomTab)

    return (
      <PanelContainer
        name={name}
        icon={icon}
        type={id}
        activeFragment={activeFragment}
        setActiveFragment={_setActiveFragment}
        customTabs={customTabs}
        isCustomContent
        tabs={tabs}
        onTabChange={onTabChange}
        activeTabId={activeTabId}
      >
        {/* Using this instead of dangerouslySetInnerHTML to support script tags */}
        {tabContent ? <InnerHTML className='absolute overflow-auto' html={tabContent} /> : null}
      </PanelContainer>
    )
  }

  return (
    <PanelContainer
      name={name}
      icon={icon}
      type={id}
      activeFragment={activeFragment}
      setActiveFragment={_setActiveFragment}
      customTabs={customTabs}
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
          <div className='mb-2 flex items-center justify-between px-1 py-1'>
            <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
              {tnMapping[activeTabId as keyof typeof tnMapping]}
            </span>
            <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>{t('project.visitors')}</span>
          </div>

          <div className='space-y-0.5'>
            {_map(entriesToDisplay, (entry) => {
              const { count, name: entryName, ...rest } = entry
              const perc = _round((count / total) * 100, 2)
              const rowData = rowMapper(entry)
              const valueData = valueMapper(count)
              const hasVersionsForItem = hasVersions(entryName)
              const isExpanded = expandedItems.has(entryName)
              const versions = versionData?.[entryName] || []

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
                      className='absolute inset-0 rounded-sm bg-blue-50 dark:bg-blue-900/10'
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
                        as={link ? 'Link' : 'div'}
                        to={link}
                        className={cx('flex min-w-0 flex-1 items-center', {
                          'cursor-pointer': !hideFilters && !dataLoading && link,
                          'cursor-wait': dataLoading,
                        })}
                      >
                        {linkContent ? (
                          <a
                            className={cx(
                              'flex items-center truncate text-sm text-blue-600 hover:underline dark:text-blue-500',
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
                            className={cx('flex items-center truncate text-sm text-gray-900 dark:text-gray-100', {
                              capitalize,
                            })}
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
                        const versionLink = getVersionFilterLink?.(entryName, versionEntry.name)

                        return (
                          <FilterWrapper
                            key={`${id}-${entryName}-${versionEntry.name}`}
                            as={versionLink ? 'Link' : 'div'}
                            to={versionLink}
                            className={cx(
                              'relative flex items-center justify-between rounded-sm px-1 py-1.5 dark:text-gray-50',
                              {
                                'group cursor-pointer hover:bg-gray-50 hover:dark:bg-slate-800':
                                  !hideFilters && !dataLoading && versionLink,
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

          {_size(data) > ENTRIES_PER_PANEL ? (
            <Button
              className='mx-auto mt-2 max-w-max border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-800/50 dark:bg-slate-800 dark:text-gray-200 hover:dark:bg-slate-700'
              type='button'
              onClick={() => setDetailsOpened(true)}
              focus={false}
            >
              <ScanIcon className='mr-1.5 size-4' />
              <span>{t('common.details')}</span>
            </Button>
          ) : null}
        </>
      )}

      <Modal
        onClose={() => setDetailsOpened(false)}
        closeText={t('common.close')}
        isOpened={detailsOpened}
        title={`${name} - ${t('common.details')}`}
        message={<DetailsTable />}
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
                  <td className='py-1 text-right'>
                    {value}
                    &nbsp;&nbsp;
                  </td>
                  <td className='py-1 pr-2 text-right'>{count}</td>
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
