import { Suspense, lazy, useMemo } from 'react'
import { useNavigate } from 'react-router'

import { useBreakdownQuery } from '~/hooks/v2/useV2Queries'
import { MapLoader } from '~/pages/Project/View/components/MapLoader'
import { mapBreakdownRows } from '~/pages/Project/View/v2/adapters'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'

const InteractiveMap = lazy(
  () => import('~/pages/Project/View/components/InteractiveMap'),
)

const MAP_CLICK_TYPE_TO_DIMENSION = { cc: 'country', rg: 'region' } as const

export const PerformanceMap = ({
  isFullscreen,
  measure,
}: {
  isFullscreen: boolean
  measure?: string
}) => {
  const navigate = useNavigate()
  const { getFilterLink, setIsMapFullscreen } = useViewProjectContext()

  const countryQuery = useBreakdownQuery('performance', {
    dimension: 'country',
    metrics: ['load_time'],
    measure,
    limit: 100,
    sort: 'load_time:desc',
  })
  const regionQuery = useBreakdownQuery('performance', {
    dimension: 'region',
    metrics: ['load_time'],
    measure,
    limit: 100,
    sort: 'load_time:desc',
  })

  const countryData = useMemo(
    () => mapBreakdownRows(countryQuery.data?.data, 'load_time'),
    [countryQuery.data],
  )
  const regionData = useMemo(
    () => mapBreakdownRows(regionQuery.data?.data, 'load_time'),
    [regionQuery.data],
  )
  const total = useMemo(
    () => countryData.reduce((acc, curr) => acc + curr.count, 0),
    [countryData],
  )

  if (countryQuery.isLoading) {
    return <MapLoader />
  }

  return (
    <Suspense fallback={<MapLoader />}>
      <InteractiveMap
        data={countryData}
        regionData={regionData}
        total={total}
        onClick={(mapType, key) => {
          navigate(getFilterLink(MAP_CLICK_TYPE_TO_DIMENSION[mapType], key))
        }}
        onFullscreenToggle={setIsMapFullscreen}
        isFullscreen={isFullscreen}
      />
    </Suspense>
  )
}
