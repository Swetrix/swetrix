import {
  ArrowsOutIcon,
  MinusIcon,
  PlusIcon,
  XIcon,
} from '@phosphor-icons/react'
import cx from 'clsx'
import { scalePow, scaleThreshold } from 'd3-scale'
import { Feature, GeoJsonObject } from 'geojson'
import { Layer, Path } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import _round from 'lodash/round'
import React, {
  memo,
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from 'react'
import { useTranslation } from 'react-i18next'
import { GeoJSON, MapContainer, useMap, useMapEvent } from 'react-leaflet'
import { ClientOnly } from 'remix-utils/client-only'

import { isSelfhosted, PROJECT_TABS } from '~/lib/constants'
import { Entry } from '~/lib/models/Entry'
import { useTheme } from '~/providers/ThemeProvider'
import Flag from '~/ui/Flag'
import { MapLoader } from './MapLoader'
import {
  getTimeFromSeconds,
  getStringFromTime,
  nFormatter,
} from '~/utils/generic'
import { loadCountriesGeoData, loadRegionsGeoData } from '~/utils/geoData'

import { useViewProjectContext } from '../ViewProject'

interface InteractiveMapProps {
  data: Entry[]
  regionData?: Entry[]
  onClick: (type: 'cc' | 'rg', key: string) => void
  total: number
  showFullscreenToggle?: boolean
  onFullscreenToggle?: (isFullscreen: boolean) => void
  isFullscreen?: boolean
}

const InteractiveMapCore = ({
  data,
  regionData,
  onClick,
  total,
  showFullscreenToggle = true,
  onFullscreenToggle,
  isFullscreen = false,
}: InteractiveMapProps) => {
  const { t } = useTranslation('common')
  const { activeTab, dataLoading } = useViewProjectContext()
  const { theme } = useTheme()

  const [countriesGeoData, setCountriesGeoData] =
    useState<GeoJsonObject | null>(null)
  const [regionsGeoData, setRegionsGeoData] = useState<GeoJsonObject | null>(
    null,
  )
  const [filteredRegionsGeoData, setFilteredRegionsGeoData] =
    useState<GeoJsonObject | null>(null)
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
  const [geoJsonKey, setGeoJsonKey] = useState(0)

  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isTrafficTab = activeTab === PROJECT_TABS.traffic
  const isErrorsTab = activeTab === PROJECT_TABS.errors
  const isPerformanceTab = activeTab === PROJECT_TABS.performance
  const isGeoDataLoading =
    mapView === 'regions' ? !regionsGeoData : !countriesGeoData

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

  // Handle Escape key to close fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen && onFullscreenToggle) {
        onFullscreenToggle(false)
      }
    }

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFullscreen, onFullscreenToggle])

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

    // Errors: light red to deep red, higher == worse
    if (isErrorsTab) {
      return scalePow<string>()
        .exponent(0.4)
        .domain([0, maxValue])
        .range(['hsla(0, 60%, 55%, 0.15)', 'hsla(0, 70%, 50%, 0.9)'])
    }

    // Performance: use fixed thresholds based on web performance standards (values are in seconds)
    // This ensures colors represent absolute performance, not relative to the data
    if (isPerformanceTab) {
      const perfColors = [
        'rgba(34, 197, 94, 0.55)', // green-500 @ 55% (< 1s - excellent)
        'rgba(74, 222, 128, 0.55)', // green-400 @ 55% (1-2s - good)
        'rgba(250, 204, 21, 0.55)', // yellow-400 @ 55% (2-3s - moderate)
        'rgba(251, 146, 60, 0.55)', // orange-400 @ 55% (3-4s - slow)
        'rgba(239, 68, 68, 0.55)', // red-500 @ 55% (4-5s - poor)
        'rgba(185, 28, 28, 0.55)', // red-700 @ 55% (> 5s - critical)
      ]
      // Fixed thresholds in seconds for absolute performance classification
      const thresholds = [1, 2, 3, 4, 5]
      return scaleThreshold<number, string>()
        .domain(thresholds)
        .range(perfColors)
    }

    // Traffic (default): blue/indigo gradient to match site color scheme
    return scalePow<string>()
      .exponent(0.4)
      .domain([0, maxValue])
      .range(['hsla(220, 70%, 55%, 0.12)', 'hsla(224, 75%, 50%, 0.9)'])
  }, [data, regionData, mapView, isErrorsTab, isPerformanceTab])

  // Get tooltip text color based on the metric value and tab
  const getTooltipColor = useCallback(
    (count: number) => {
      if (isTrafficTab) {
        return 'rgb(79, 70, 229)' // indigo-600
      }
      if (isErrorsTab) {
        return 'rgb(220, 38, 38)' // red-600
      }
      // Performance: use fixed thresholds matching the map colors (but fully opaque for text)
      if (count < 1) return 'rgb(34, 197, 94)' // green-500
      if (count < 2) return 'rgb(22, 163, 74)' // green-600
      if (count < 3) return 'rgb(202, 138, 4)' // yellow-600
      if (count < 4) return 'rgb(234, 88, 12)' // orange-600
      if (count < 5) return 'rgb(220, 38, 38)' // red-600
      return 'rgb(153, 27, 27)' // red-800
    },
    [isTrafficTab, isErrorsTab],
  )

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

      // No-data countries: subtle, muted gray that blends with the background
      const noDataFill =
        theme === 'dark' ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.6)'
      const fill = metricValue > 0 ? colorScale(metricValue) : noDataFill

      // Borders: very subtle, almost invisible for cleaner look
      const borderBaseColour =
        theme === 'dark'
          ? 'rgba(71, 85, 105, 0.4)'
          : 'rgba(148, 163, 184, 0.35)'

      return {
        color: borderBaseColour,
        weight: mapView === 'regions' ? 0.6 : 0.4,
        fill: true,
        fillColor: fill,
        fillOpacity: metricValue > 0 ? 0.85 : 0.4,
        opacity: 1,
        smoothFactor: mapView === 'regions' ? 1 : 0.3,
        className:
          'transition-[stroke,stroke-width,fill-opacity] duration-200 ease-out',
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
          // Use contextual colors based on tab: indigo for traffic, neutral for performance (to not clash with green-red), red-ish for errors
          let borderHoverColour: string
          if (isPerformanceTab) {
            borderHoverColour = theme === 'dark' ? '#e2e8f0' : '#334155' // slate-200/700 - neutral for green-red palette
          } else if (isErrorsTab) {
            borderHoverColour = theme === 'dark' ? '#f87171' : '#dc2626' // red-400/600
          } else {
            borderHoverColour = theme === 'dark' ? '#818cf8' : '#4f46e5' // indigo-400/600 for traffic
          }
          const borderNeutralHoverColour =
            theme === 'dark' ? '#64748b' : '#94a3b8' // slate-500/400
          const pathLayer = layer as unknown as Path
          const canSetStyle = typeof (pathLayer as any).setStyle === 'function'
          if (canSetStyle) {
            pathLayer.setStyle({
              color: hasData ? borderHoverColour : borderNeutralHoverColour,
              weight: 1.5,
            } as any)
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

            const name =
              props['name'] || props['ADMIN'] || result?.key || 'Unknown'
            const count = result?.data?.count ?? 0
            const percentage = total > 0 ? _round((count / total) * 100, 2) : 0

            const ccFromProps = isCountryView
              ? props?.iso_a2
              : (props?.iso_3166_2 || '').split('-')[0]
            const cc =
              (result?.data?.cc as string | undefined) || ccFromProps || ''

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
          const clickType =
            mapView === 'regions' ? (isTaiwanRegion ? 'cc' : 'rg') : 'cc'

          onClick(clickType, key)
        },
      })
    },
    [
      findDataForFeature,
      total,
      onClick,
      mapView,
      theme,
      handleStyle,
      repositionTooltip,
      isErrorsTab,
      isPerformanceTab,
    ],
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

  const MapZoomControls = ({ visible }: { visible: boolean }) => {
    const map = useMap()

    if (!visible) return null

    return (
      <div className='pointer-events-none absolute right-3 bottom-3 z-400 flex flex-col gap-1'>
        <button
          type='button'
          onClick={() => map.zoomIn()}
          className='pointer-events-auto rounded-md border border-gray-300 bg-gray-50 p-2 text-gray-700 shadow-sm transition-colors ring-inset hover:bg-white focus:z-10 focus:ring-1 focus:ring-slate-900 focus:outline-hidden dark:border-slate-700/80 dark:bg-slate-950 dark:text-gray-200 dark:hover:bg-slate-900 dark:focus:ring-slate-300'
          aria-label='Zoom in'
          title='Zoom in'
        >
          <PlusIcon className='size-4' />
        </button>
        <button
          type='button'
          onClick={() => map.zoomOut()}
          className='pointer-events-auto rounded-md border border-gray-300 bg-gray-50 p-2 text-gray-700 shadow-sm transition-colors ring-inset hover:bg-white focus:z-10 focus:ring-1 focus:ring-slate-900 focus:outline-hidden dark:border-slate-700/80 dark:bg-slate-950 dark:text-gray-200 dark:hover:bg-slate-900 dark:focus:ring-slate-300'
          aria-label='Zoom out'
          title='Zoom out'
        >
          <MinusIcon className='size-4' />
        </button>
      </div>
    )
  }

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!tooltipContent) return
      repositionTooltip(e.clientX, e.clientY)
    },
    [tooltipContent, repositionTooltip],
  )

  return (
    <div
      className={cx('relative h-full w-full', {
        'bg-slate-100 dark:bg-slate-950': isFullscreen,
      })}
      onMouseMove={handleMouseMove}
    >
      {/* Fullscreen toggle button (expand) */}
      {showFullscreenToggle && !isFullscreen && onFullscreenToggle ? (
        <div className='absolute top-1 right-1 z-20'>
          <button
            type='button'
            onClick={() => onFullscreenToggle(true)}
            aria-label='Fullscreen'
            title='Fullscreen'
            className='rounded-md border border-gray-300 bg-gray-50 p-1.5 text-gray-700 transition-colors ring-inset hover:bg-white focus:z-10 focus:ring-1 focus:ring-slate-900 focus:outline-hidden dark:border-slate-700/80 dark:bg-slate-950 dark:text-gray-200 dark:hover:bg-slate-900 dark:focus:ring-slate-300'
          >
            <ArrowsOutIcon className='size-4' />
          </button>
        </div>
      ) : null}

      {/* Exit fullscreen button */}
      {isFullscreen && onFullscreenToggle ? (
        <div className='absolute top-3 right-3 z-50'>
          <button
            type='button'
            onClick={() => onFullscreenToggle(false)}
            className='flex items-center rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors ring-inset hover:bg-white focus:z-10 focus:ring-1 focus:ring-slate-900 focus:outline-hidden dark:border-slate-700/80 dark:bg-slate-950 dark:text-gray-200 dark:hover:bg-slate-900 dark:focus:ring-slate-300'
          >
            <XIcon className='mr-1.5 h-4 w-4' />
            {t('common.close')}
          </button>
        </div>
      ) : null}

      {dataLoading || isGeoDataLoading ? (
        <div className='absolute inset-0 z-10'>
          <MapLoader />
        </div>
      ) : null}

      {countriesGeoData || regionsGeoData ? (
        <MapContainer
          center={[40, 3]}
          minZoom={1}
          maxZoom={8}
          zoom={isFullscreen ? 2 : 1}
          style={{
            height: '100%',
            background: 'transparent',
            cursor: 'default',
            outline: 'none',
            zIndex: 1,
            ...(isFullscreen
              ? {
                  minHeight: '100vh',
                }
              : {}),
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
          <MapZoomControls visible={isFullscreen} />
        </MapContainer>
      ) : null}

      {tooltipContent ? (
        <div
          ref={tooltipRef}
          className='pointer-events-none fixed z-50 rounded-md border border-gray-200 bg-white/95 p-2 text-sm text-gray-900 shadow-md backdrop-blur-sm dark:border-slate-700 dark:bg-slate-950/95 dark:text-white'
          style={{ left: 0, top: 0, transform: 'translate(-50%, -100%)' }}
        >
          <div className='flex items-center gap-1.5 font-medium'>
            <Flag
              className='rounded-xs'
              country={tooltipContent.code}
              size={18}
              alt=''
              aria-hidden='true'
            />
            <span>{tooltipContent.name}</span>
          </div>
          <div className='mt-0.5'>
            <span
              className='font-bold'
              style={{ color: getTooltipColor(tooltipContent.count) }}
            >
              {isTrafficTab || isErrorsTab
                ? nFormatter(tooltipContent.count, 1)
                : getStringFromTime(
                    getTimeFromSeconds(tooltipContent.count),
                    true,
                  )}
            </span>{' '}
            <span className='text-gray-500 dark:text-gray-400'>
              ({tooltipContent.percentage.toFixed(1)}%)
              {isTrafficTab
                ? ' visitors'
                : isErrorsTab
                  ? ' occurrences'
                  : ' avg load time'}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const InteractiveMap = ({
  data,
  regionData,
  onClick,
  total,
  onFullscreenToggle,
  isFullscreen,
}: InteractiveMapProps) => {
  return (
    <ClientOnly fallback={<MapLoader />}>
      {() => (
        <InteractiveMapCore
          data={data}
          regionData={regionData}
          onClick={onClick}
          total={total}
          onFullscreenToggle={onFullscreenToggle}
          isFullscreen={isFullscreen}
        />
      )}
    </ClientOnly>
  )
}

export default memo(InteractiveMap)
