import { Suspense, lazy, useMemo } from 'react'
import { useNavigate } from 'react-router'

import { useBreakdownQuery } from '~/hooks/v2/useV2Queries'
import { Entry } from '~/lib/models/Entry'
import { MapLoader } from '~/pages/Project/View/components/MapLoader'
import { mapBreakdownRows } from '~/pages/Project/View/v2/adapters'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'

const InteractiveMap = lazy(
  () => import('~/pages/Project/View/components/InteractiveMap'),
)

const MAP_CLICK_TYPE_TO_DIMENSION = { cc: 'country', rg: 'region' } as const

interface ErrorsMapProps {
  /** Static per-error data (details view); when set, no queries are fired */
  staticCountryData?: Entry[]
  staticRegionData?: Entry[]
}

/**
 * Error occurrences location map. Project-wide it feeds itself via country +
 * region breakdown queries (deduped with the location panel's queries through
 * the react-query cache); on the error-details view it renders the per-error
 * `params` payload passed in statically.
 */
export const ErrorsMap = ({
  staticCountryData,
  staticRegionData,
}: ErrorsMapProps) => {
  const navigate = useNavigate()
  const { getFilterLink } = useViewProjectContext()
  const isStatic = Boolean(staticCountryData)

  const countryQuery = useBreakdownQuery('errors', {
    dimension: 'country',
    limit: 100,
    sort: 'occurrences:desc',
    enabled: !isStatic,
  })
  const regionQuery = useBreakdownQuery('errors', {
    dimension: 'region',
    limit: 100,
    sort: 'occurrences:desc',
    enabled: !isStatic,
  })

  const countryData = useMemo(
    () =>
      staticCountryData ??
      mapBreakdownRows(countryQuery.data?.data, 'occurrences'),
    [staticCountryData, countryQuery.data],
  )
  const regionData = useMemo(
    () =>
      staticRegionData ??
      mapBreakdownRows(regionQuery.data?.data, 'occurrences'),
    [staticRegionData, regionQuery.data],
  )
  const total = useMemo(
    () => countryData.reduce((acc, curr) => acc + curr.count, 0),
    [countryData],
  )

  if (!isStatic && countryQuery.isLoading) {
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
      />
    </Suspense>
  )
}
