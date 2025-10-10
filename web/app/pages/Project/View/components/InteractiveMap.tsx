import { ArrowsPointingOutIcon } from '@heroicons/react/24/outline'
import { scalePow, scaleQuantize } from 'd3-scale'
import { Feature, GeoJsonObject } from 'geojson'
import { Layer, Path } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import _round from 'lodash/round'
import React, { memo, useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { GeoJSON, MapContainer, useMapEvent } from 'react-leaflet'
import { ClientOnly } from 'remix-utils/client-only'

import { isSelfhosted, PROJECT_TABS } from '~/lib/constants'
import { Entry } from '~/lib/models/Entry'
import { useTheme } from '~/providers/ThemeProvider'
import Flag from '~/ui/Flag'
import Spin from '~/ui/icons/Spin'
import Modal from '~/ui/Modal'
import { getTimeFromSeconds, getStringFromTime, nFormatter } from '~/utils/generic'
import { loadCountriesGeoData, loadRegionsGeoData } from '~/utils/geoData'

import { useViewProjectContext } from '../ViewProject'

interface InteractiveMapProps {
  data: Entry[]
  regionData?: Entry[]
  onClick: (type: 'cc' | 'rg', key: string) => void
  total: number
  showFullscreenToggle?: boolean
}

const InteractiveMapCore = ({ data, regionData, onClick, total, showFullscreenToggle = true }: InteractiveMapProps) => {
  const { t } = useTranslation('common')
  const { activeTab, dataLoading } = useViewProjectContext()
  const { theme } = useTheme()

  const [countriesGeoData, setCountriesGeoData] = useState<GeoJsonObject | null>(null)
  const [regionsGeoData, setRegionsGeoData] = useState<GeoJsonObject | null>(null)
  const [filteredRegionsGeoData, setFilteredRegionsGeoData] = useState<GeoJsonObject | null>(null)
  const [mapView, setMapView] = useState<'countries' | 'regions'>('countries')
  const [tooltipContent, setTooltipContent] = useState<{
    name: string
    code: string
    count: number
    percentage: number
  } | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const mousePosRef = useRef({ x: 0, y: 0 })
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false)
  const [geoJsonKey, setGeoJsonKey] = useState(0)

  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isTrafficTab = activeTab === PROJECT_TABS.traffic
  const isErrorsTab = activeTab === PROJECT_TABS.errors
  const isPerformanceTab = activeTab === PROJECT_TABS.performance
  const isGeoDataLoading = mapView === 'regions' ? !regionsGeoData : !countriesGeoData

  useEffect(() => {
    const loadGeoData = async () => {
      try {
        const [countries, regions] = await Promise.all([
          loadCountriesGeoData(),
          isSelfhosted ? Promise.resolve(null) : loadRegionsGeoData(),
        ])
        setCountriesGeoData(countries)
        setRegionsGeoData(regions)
        setFilteredRegionsGeoData(regions)
      } catch (reason) {
        console.error('Failed to load geographic data:', reason)
      }
    }

    loadGeoData()
  }, [])

  useEffect(() => {
    setGeoJsonKey((v) => v + 1)
  }, [data, regionData, mapView])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    }
  }, [])

  const repositionTooltip = useCallback((x: number, y: number) => {
    mousePosRef.current = { x, y }
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        const el = tooltipRef.current
        if (!el) return
        const { x: mx, y: my } = mousePosRef.current
        el.style.left = `${mx}px`
        el.style.top = `${my - 10}px`
        el.style.transform = 'translate(-50%, -100%)'
      })
    }
  }, [])

  const dataLookup = useMemo<Map<string, any>>(() => {
    const lookup = new Map()
    const currentData = mapView === 'countries' ? data : regionData

    if (!currentData) return lookup

    currentData.forEach((item) => {
      if (mapView === 'countries') {
        const key = item.cc || item.name
        if (key) {
          lookup.set(key.toLowerCase(), item)
        }
      } else {
        // Regions: use ISO-based key "CC-RGC" (e.g., UA-05, GB-ENG)
        if (item.cc && item.rgc) {
          const isoKey = `${item.cc}-${item.rgc}`.toLowerCase()
          lookup.set(isoKey, item)
        }
      }
    })

    return lookup
  }, [data, regionData, mapView])

  // Country-level lookup used for special-cases while viewing regions (e.g., TW)
  const countryDataLookup = useMemo<Map<string, any>>(() => {
    const lookup = new Map()
    if (!data) return lookup
    data.forEach((item) => {
      const key = (item.cc || item.name)?.toLowerCase()
      if (key) {
        lookup.set(key, item)
      }
    })
    return lookup
  }, [data])

  const colorScale = useMemo(() => {
    if (mapView === 'countries' && !data) return () => '#eee'
    if (mapView === 'regions' && !regionData) return () => '#eee'

    const dataToUse = mapView === 'countries' ? data : regionData
    const values = dataToUse?.map((d) => d.count) || [0]
    const maxValue = Math.max(...values)
    const minValue = Math.min(...values)

    // Errors: light red to deep red, higher == worse
    if (isErrorsTab) {
      return scalePow<string>()
        .exponent(0.4)
        .domain([0, maxValue])
        .range(['hsla(0, 75%, 50%, 0.08)', 'hsla(0, 75%, 45%, 0.85)'])
    }

    // Performance: discrete, darker Tailwind palette with 80% opacity -> blue (fast) to warm (slow)
    if (isPerformanceTab) {
      if (minValue === maxValue) {
        const singleColor = 'rgba(29, 78, 216, 0.8)' // blue-700 @ 80%
        return () => singleColor
      }
      const perfColors = [
        'rgba(29, 78, 216, 0.8)', // blue-700 @ 80%
        'rgba(37, 99, 235, 0.8)', // blue-600 @ 80%
        'rgba(59, 130, 246, 0.8)', // blue-500 @ 80%
        'rgba(217, 119, 6, 0.8)', // amber-600 @ 80%
        'rgba(234, 88, 12, 0.8)', // orange-600 @ 80%
        'rgba(220, 38, 38, 0.8)', // red-600 @ 80%
        'rgba(185, 28, 28, 0.8)', // red-700 @ 80%
        'rgba(153, 27, 27, 0.8)', // red-800 @ 80%
      ]
      return scaleQuantize<string>().domain([minValue, maxValue]).range(perfColors)
    }

    // Traffic (default): light to saturated blue with power easing
    return scalePow<string>()
      .exponent(0.4)
      .domain([0, maxValue])
      .range(['hsla(220, 70%, 50%, 0.05)', 'hsla(220, 70%, 50%, 0.8)'])
  }, [data, regionData, mapView, isErrorsTab, isPerformanceTab])

  const findDataForFeature = useCallback(
    (feature: Feature | undefined) => {
      if (!feature?.properties) return null

      const props = feature.properties
      const isCountryView = mapView === 'countries'

      if (isCountryView) {
        const found = dataLookup.get(props.iso_a2?.toLowerCase() || '')
        if (found) return { data: found, key: found.cc || found.name }
      } else {
        const iso = (props as any)?.iso_3166_2 as string | undefined
        if (iso) {
          // For Taiwan in regions view, use country-level data for TW
          // Because IP geolocation provider does not provide ISO code for regions
          const upperIso = iso.toUpperCase()
          if (upperIso === 'TW') {
            const twCountry = countryDataLookup.get('tw')
            if (twCountry) {
              return { data: twCountry, key: twCountry.cc || twCountry.name }
            }
          }

          const found = dataLookup.get(iso.toLowerCase())
          if (found) return { data: found, key: found.cc || found.name }
        }
      }

      return null
    },
    [mapView, dataLookup, countryDataLookup],
  )

  const handleStyle = useCallback(
    (feature: Feature | undefined) => {
      const result = findDataForFeature(feature)
      const metricValue = result?.data?.count || 0

      const fill = metricValue > 0 ? colorScale(metricValue) : 'rgba(180, 180, 180, 0.3)'

      const borderBaseColour = theme === 'dark' ? '#475569' : '#cbd5e1'

      return {
        color: borderBaseColour,
        weight: mapView === 'regions' ? 0.8 : 0.5,
        fill: true,
        fillColor: fill,
        fillOpacity: metricValue > 0 ? 0.7 : 0.3,
        opacity: 1,
        smoothFactor: mapView === 'regions' ? 1 : 0.3,
        className: 'transition-[stroke,stroke-width,fill-opacity] duration-200 ease-out',
      }
    },
    [mapView, colorScale, findDataForFeature, theme],
  )

  const handleEachFeature = useCallback(
    (feature: Feature, layer: Layer) => {
      layer.on({
        mouseover: (e: any) => {
          const resultNow = findDataForFeature(feature)
          const hasData = (resultNow?.data?.count || 0) > 0
          const borderHoverColour = theme === 'dark' ? '#1d4ed8' : '#60a5fa'
          const borderNeutralHoverColour = '#94a3b8' // slate-400
          const pathLayer = layer as unknown as Path
          const canSetStyle = typeof (pathLayer as any).setStyle === 'function'
          if (canSetStyle) {
            pathLayer.setStyle({ color: hasData ? borderHoverColour : borderNeutralHoverColour, weight: 1.5 } as any)
            ;(pathLayer as any).bringToFront?.()
          }
          const cx = e?.originalEvent?.clientX ?? 0
          const cy = e?.originalEvent?.clientY ?? 0
          repositionTooltip(cx, cy)

          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current)
          }

          hoverTimeoutRef.current = setTimeout(() => {
            const result = findDataForFeature(feature)
            const props: any = feature.properties || {}
            const isCountryView = mapView === 'countries'

            const name = props['name'] || props['ADMIN'] || result?.key || 'Unknown'
            const count = result?.data?.count ?? 0
            const percentage = total > 0 ? _round((count / total) * 100, 2) : 0

            const ccFromProps = isCountryView ? props?.iso_a2 : (props?.iso_3166_2 || '').split('-')[0]
            const cc = (result?.data?.cc as string | undefined) || ccFromProps || ''

            setTooltipContent({
              name,
              code: (cc || '').toUpperCase(),
              count,
              percentage,
            })

            // Ensure tooltip positions right after it mounts
            const { x, y } = mousePosRef.current
            setTimeout(() => repositionTooltip(x, y), 0)
          }, 50)
        },
        mousemove: (e: any) => {
          const cx = e?.originalEvent?.clientX ?? 0
          const cy = e?.originalEvent?.clientY ?? 0
          repositionTooltip(cx, cy)
        },
        mouseout: () => {
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current)
          }
          // Revert to base style for this layer only
          const base = handleStyle(feature)
          const pathLayer = layer as unknown as Path
          if (typeof (pathLayer as any).setStyle === 'function') {
            pathLayer.setStyle(base as any)
          }
          setTooltipContent(null)
        },
        click: () => {
          const result = findDataForFeature(feature)

          const key = result?.data?.name

          if (!key) return

          // For Taiwan, in regions view, emit a cc filter instead of rg
          const props: any = feature.properties || {}
          const iso = props?.iso_3166_2 as string | undefined
          const isTaiwanRegion = !!(iso && iso.toUpperCase() === 'TW')
          const clickType = mapView === 'regions' ? (isTaiwanRegion ? 'cc' : 'rg') : 'cc'

          onClick(clickType, key)
        },
      })
    },
    [findDataForFeature, total, onClick, mapView, theme, handleStyle, repositionTooltip],
  )

  const MapEventHandler = () => {
    const map = useMapEvent('zoomend', () => {
      if (isSelfhosted) return

      const currentZoom = map.getZoom()
      const newMapView = currentZoom >= 4 ? 'regions' : 'countries'
      if (newMapView !== mapView) {
        setMapView(newMapView)
        setTooltipContent(null)
      }
    })
    return null
  }

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!tooltipContent) return
      repositionTooltip(e.clientX, e.clientY)
    },
    [tooltipContent, repositionTooltip],
  )

  return (
    <div className='relative h-full w-full' onMouseMove={handleMouseMove}>
      {showFullscreenToggle ? (
        <div className='absolute top-0.5 right-0.5 z-20'>
          <button
            type='button'
            onClick={() => setIsFullscreenOpen(true)}
            aria-label='Fullscreen'
            title='Fullscreen'
            className='rounded-md p-1.5 text-gray-800 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-300'
          >
            <ArrowsPointingOutIcon className='size-5' />
          </button>
        </div>
      ) : null}
      {dataLoading || isGeoDataLoading ? (
        <div className='absolute inset-0 z-10 flex items-center justify-center rounded-md bg-slate-900/20 backdrop-blur-sm'>
          <div className='flex flex-col items-center gap-2'>
            <Spin />
            <span className='text-sm text-slate-900 dark:text-gray-50'>{t('project.loadingMapData')}</span>
          </div>
        </div>
      ) : null}

      {countriesGeoData || regionsGeoData ? (
        <MapContainer
          center={[40, 3]}
          minZoom={1}
          maxZoom={8}
          zoom={showFullscreenToggle ? 1 : 2}
          style={{
            height: '100%',
            background: 'transparent',
            cursor: 'default',
            outline: 'none',
            zIndex: 1,
          }}
          attributionControl={false}
          zoomControl={false}
          preferCanvas
        >
          <MapEventHandler />

          {countriesGeoData && mapView === 'countries' ? (
            <GeoJSON
              key={geoJsonKey}
              data={countriesGeoData}
              style={handleStyle}
              onEachFeature={handleEachFeature}
              pathOptions={{
                interactive: true,
                bubblingMouseEvents: false,
              }}
            />
          ) : null}

          {filteredRegionsGeoData && mapView === 'regions' ? (
            <GeoJSON
              key={geoJsonKey}
              data={filteredRegionsGeoData}
              style={handleStyle}
              onEachFeature={handleEachFeature}
              pathOptions={{
                interactive: true,
                bubblingMouseEvents: false,
              }}
            />
          ) : null}
        </MapContainer>
      ) : null}

      {tooltipContent ? (
        <div
          ref={tooltipRef}
          className='pointer-events-none fixed z-50 rounded-md border bg-gray-100 p-2 text-sm text-gray-900 shadow-lg dark:bg-slate-900 dark:text-white'
          style={{ left: 0, top: 0, transform: 'translate(-50%, -100%)' }}
        >
          <div className='flex items-center gap-1 font-medium'>
            <Flag className='rounded-xs' country={tooltipContent.code} size={18} alt='' aria-hidden='true' />
            <span>{tooltipContent.name}</span>
          </div>
          <div>
            <span className='font-bold text-blue-600 dark:text-blue-400'>
              {isTrafficTab || isErrorsTab
                ? nFormatter(tooltipContent.count, 1)
                : getStringFromTime(getTimeFromSeconds(tooltipContent.count), true)}
            </span>{' '}
            <span className='text-gray-600 dark:text-gray-300'>
              ({tooltipContent.percentage.toFixed(1)}%)
              {isTrafficTab ? ' visitors' : isErrorsTab ? ' occurrences' : ' avg load time'}
            </span>
          </div>
        </div>
      ) : null}

      <Modal
        isOpened={isFullscreenOpen}
        onClose={() => setIsFullscreenOpen(false)}
        closeText={t('common.close')}
        size='large'
        overflowVisible
        message={
          <div className='h-[70vh] w-full'>
            <ClientOnly
              fallback={
                <div className='relative flex h-full w-full items-center justify-center'>
                  <div className='flex flex-col items-center gap-2'>
                    <div className='h-8 w-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent'></div>
                    <span className='text-sm text-neutral-600 dark:text-neutral-300'>
                      {t('project.loadingMapData')}
                    </span>
                  </div>
                </div>
              }
            >
              {() => (
                <InteractiveMapCore
                  data={data}
                  regionData={regionData}
                  onClick={onClick}
                  total={total}
                  showFullscreenToggle={false}
                />
              )}
            </ClientOnly>
          </div>
        }
      />
    </div>
  )
}

const InteractiveMap = ({ data, regionData, onClick, total }: InteractiveMapProps) => {
  const { t } = useTranslation('common')

  return (
    <ClientOnly
      fallback={
        <div className='relative flex h-full w-full items-center justify-center'>
          <div className='flex flex-col items-center gap-2'>
            <div className='h-8 w-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent'></div>
            <span className='text-sm text-neutral-600 dark:text-neutral-300'>{t('project.loadingMapData')}</span>
          </div>
        </div>
      }
    >
      {() => <InteractiveMapCore data={data} regionData={regionData} onClick={onClick} total={total} />}
    </ClientOnly>
  )
}

export default memo(InteractiveMap)
