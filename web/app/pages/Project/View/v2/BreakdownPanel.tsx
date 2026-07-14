import { ArrowsClockwiseIcon, WarningOctagonIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LinkProps } from 'react-router'

import { V2DataType } from '~/api/v2/types'
import { useBreakdownDetailsQuery } from '~/hooks/v2/useV2Queries'
import { useInViewOnce } from '~/hooks/useInViewOnce'
import { Entry } from '~/lib/models/Entry'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'
import Button from '~/ui/Button'
import { Text } from '~/ui/Text'
import { getItem, setItem } from '~/utils/localstorage'

import { Panel, PanelContainer } from '../Panels'
import { groupVersionRows, mapBreakdownRows } from './adapters'

export interface BreakdownSubTab {
  id: string
  label: string
  dimension?: string
  render?: () => React.ReactNode
  versionsDimension?: 'browser_version' | 'os_version'
  versionsParentField?: 'browser' | 'os'
}

interface BreakdownPanelProps {
  dataType: V2DataType
  panelId: string
  name: string
  icon: React.ReactNode
  subTabs: (BreakdownSubTab | BreakdownSubTab[])[]
  primaryMetric?: string
  metrics?: string[]
  measure?: string
  rowMapper?: (entry: Entry, subTabId: string) => React.ReactNode
  valueMapper?: (value: number, subTabId: string) => number
  transformEntries?: (entries: Entry[], subTabId: string) => Entry[]
  capitalize?: string[]
  getFilterLink?: (
    dimension: string,
    value: string | null,
    subTabId: string,
  ) => LinkProps['to']
  getVersionFilterLink?: (
    parent: string | null,
    version: string | null,
    subTabId: string,
  ) => LinkProps['to'] | string
  valuesHeaderName?: string
  highlightColour?: 'blue' | 'red' | 'orange'
  onActiveSubTabChange?: (subTabId: string) => void
}

const subTabStorageKey = (dataType: string, panelId: string) =>
  `v2PanelTab:${dataType}:${panelId}`

export const BreakdownPanel = ({
  dataType,
  panelId,
  name,
  icon,
  subTabs,
  primaryMetric = 'visitors',
  metrics,
  measure,
  rowMapper,
  valueMapper,
  transformEntries,
  capitalize,
  getFilterLink: getFilterLinkProp,
  getVersionFilterLink,
  valuesHeaderName,
  highlightColour,
  onActiveSubTabChange,
}: BreakdownPanelProps) => {
  const { t } = useTranslation('common')
  const { getFilterLink: getFilterLinkContext } = useViewProjectContext()
  const { ref, hasBeenInView } = useInViewOnce()

  const flatSubTabs = useMemo(() => subTabs.flat(), [subTabs])

  const [activeSubTabId, setActiveSubTabId] = useState<string>(() => {
    const stored = getItem(subTabStorageKey(dataType, panelId))
    if (stored && flatSubTabs.some((tab) => tab.id === stored)) {
      return stored as string
    }
    return flatSubTabs[0].id
  })

  const activeSubTab =
    flatSubTabs.find((tab) => tab.id === activeSubTabId) || flatSubTabs[0]

  const onSubTabChange = (tabId: string) => {
    setActiveSubTabId(tabId)
    setItem(subTabStorageKey(dataType, panelId), tabId)
    onActiveSubTabChange?.(tabId)
  }

  const isSentinel = !activeSubTab.dimension

  const query = useBreakdownDetailsQuery(dataType, {
    dimension: activeSubTab.dimension || '',
    metrics,
    measure,
    sort: `${primaryMetric}:desc`,
    enabled: hasBeenInView && !isSentinel,
  })

  const versionsQuery = useBreakdownDetailsQuery(dataType, {
    dimension: activeSubTab.versionsDimension || '',
    metrics,
    measure,
    sort: `${primaryMetric}:desc`,
    enabled: hasBeenInView && Boolean(activeSubTab.versionsDimension),
  })

  const entries = useMemo(() => {
    const mapped = mapBreakdownRows(
      query.data?.pages.flatMap((page) => page.data),
      primaryMetric,
    )
    return transformEntries ? transformEntries(mapped, activeSubTabId) : mapped
  }, [query.data, primaryMetric, transformEntries, activeSubTabId])

  const versionData = useMemo(() => {
    if (!activeSubTab.versionsDimension || !versionsQuery.data) {
      return undefined
    }

    return groupVersionRows(
      versionsQuery.data.pages.flatMap((page) => page.data),
      activeSubTab.versionsParentField || 'browser',
      primaryMetric,
    )
  }, [activeSubTab, versionsQuery.data, primaryMetric])

  const total = query.data?.pages[0]?.meta.total

  const containerTabs =
    flatSubTabs.length > 1
      ? subTabs.map((tab) =>
          Array.isArray(tab)
            ? tab.map(({ id, label }) => ({ id, label }))
            : { id: tab.id, label: tab.label },
        )
      : undefined

  if (isSentinel) {
    return (
      <div ref={ref}>
        <PanelContainer
          name={name}
          icon={icon}
          type={activeSubTabId}
          tabs={containerTabs}
          onTabChange={onSubTabChange}
          activeTabId={activeSubTabId}
        >
          {activeSubTab.render?.()}
        </PanelContainer>
      </div>
    )
  }

  // Panels below the fold only start fetching once scrolled into view, which
  // leaves the query pending rather than loading — both mean "no rows yet".
  const isLoading = query.isLoading || (!hasBeenInView && !query.data)

  const renderError = () => (
    <div className='flex h-full flex-1 flex-col items-center justify-center px-4 py-8 text-center'>
      <div className='mb-3 flex size-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-900'>
        <WarningOctagonIcon className='size-5 text-gray-400 dark:text-slate-500' />
      </div>
      <Text as='p' size='sm' colour='secondary'>
        {t('apiNotifications.somethingWentWrong')}
      </Text>
      <Button
        className='mt-3 gap-1.5'
        onClick={() => query.refetch()}
        variant='secondary'
        size='sm'
      >
        <ArrowsClockwiseIcon className='size-4' />
        {t('project.refreshStats')}
      </Button>
    </div>
  )

  return (
    <div ref={ref}>
      <Panel
        key={activeSubTabId}
        icon={icon}
        id={activeSubTab.dimension || activeSubTabId}
        name={name}
        data={entries}
        serverTotal={total}
        isLoading={isLoading}
        customRenderer={query.isError ? renderError : undefined}
        tabs={containerTabs}
        onTabChange={onSubTabChange}
        activeTabId={activeSubTabId}
        rowMapper={
          rowMapper ? (entry) => rowMapper(entry, activeSubTabId) : undefined
        }
        valueMapper={
          valueMapper
            ? (value) => valueMapper(value, activeSubTabId)
            : undefined
        }
        capitalize={capitalize?.includes(activeSubTabId)}
        getFilterLink={(dimension, value) =>
          getFilterLinkProp
            ? getFilterLinkProp(dimension, value, activeSubTabId)
            : getFilterLinkContext(dimension, value)
        }
        versionData={versionData}
        getVersionFilterLink={
          getVersionFilterLink
            ? (parent, version) =>
                getVersionFilterLink(parent, version, activeSubTabId)
            : undefined
        }
        valuesHeaderName={valuesHeaderName}
        highlightColour={highlightColour}
        dataLoading={query.isFetching && !query.isFetchingNextPage}
        isRefetching={
          query.isFetching && !query.isLoading && !query.isFetchingNextPage
        }
        onLoadMore={query.hasNextPage ? () => query.fetchNextPage() : undefined}
        loadingMore={query.isFetchingNextPage}
      />
    </div>
  )
}
