import { Suspense, lazy, useMemo } from 'react'
import { useNavigate } from 'react-router'

import { useBreakdownQuery } from '~/hooks/v2/useV2Queries'
import { MapLoader } from '~/pages/Project/View/components/MapLoader'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'

import { mapBreakdownRows } from './adapters'

const InteractiveMap = lazy(
  () => import('~/pages/Project/View/components/InteractiveMap'),
)

const MAP_CLICK_TYPE_TO_DIMENSION = { cc: 'country', rg: 'region' } as const

export const TrafficMap = ({ isFullscreen }: { isFullscreen: boolean }) => {
  const navigate = useNavigate()
  const { getFilterLink, setIsMapFullscreen } = useViewProjectContext()

  const countryQuery = useBreakdownQuery('traffic', {
    dimension: 'country',
    limit: 100,
    sort: 'visitors:desc',
  })
  const regionQuery = useBreakdownQuery('traffic', {
    dimension: 'region',
    limit: 100,
    sort: 'visitors:desc',
  })

  const countryData = useMemo(
    () => mapBreakdownRows(countryQuery.data?.data),
    [countryQuery.data],
  )
  const regionData = useMemo(
    () => mapBreakdownRows(regionQuery.data?.data),
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
