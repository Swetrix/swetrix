import billboard, { type Chart, type ChartOptions } from 'billboard.js'
import cx from 'clsx'
import React, { useEffect, useMemo, useRef } from 'react'

import { trackError } from '~/utils/analytics'

interface BillboardChartProps {
  options: ChartOptions
  dataNames?: Record<string, string>
  className?: string
  onReady?: (chart: Chart | null) => void
  deps?: any[]
}

const BillboardChart = ({
  options,
  dataNames,
  className,
  onReady,
  deps,
}: BillboardChartProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<Chart | null>(null)
  const isDestroyingRef = useRef(false)

  const mergedDeps = useMemo(
    () => deps || [options, dataNames],
    [deps, options, dataNames],
  )

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    // Destroy previous chart synchronously if exists (for deps changes)
    if (chartRef.current) {
      isDestroyingRef.current = true
      try {
        chartRef.current.destroy()
      } catch {
        // ignore destroy errors
      }
      chartRef.current = null
      isDestroyingRef.current = false
      if (onReady) onReady(null)
    }

    // Wrap callbacks to guard against destroyed chart access
    const wrappedOptions: ChartOptions = {
      ...options,
      bindto: containerRef.current as unknown as HTMLElement,
    }

    // Wrap onrendered callback to prevent access after destroy
    if (options.onrendered) {
      const originalOnRendered = options.onrendered
      wrappedOptions.onrendered = function (this: Chart) {
        if (isDestroyingRef.current || !chartRef.current) {
          return
        }
        try {
          originalOnRendered.call(this)
        } catch {
          // ignore errors during render if chart is being destroyed
        }
      }
    }

    // Wrap onresize callback
    if (options.onresize) {
      const originalOnResize = options.onresize
      wrappedOptions.onresize = function (this: Chart) {
        if (isDestroyingRef.current || !chartRef.current) {
          return
        }
        try {
          originalOnResize.call(this)
        } catch {
          // ignore
        }
      }
    }

    // Wrap onresized callback
    if (options.onresized) {
      const originalOnResized = options.onresized
      wrappedOptions.onresized = function (this: Chart) {
        if (isDestroyingRef.current || !chartRef.current) {
          return
        }
        try {
          originalOnResized.call(this)
        } catch {
          // ignore
        }
      }
    }

    // Wrap zoom.onzoom callback to prevent access after destroy
    if (options.zoom?.onzoom) {
      const originalOnZoom = options.zoom.onzoom
      wrappedOptions.zoom = {
        ...options.zoom,
        onzoom: function (this: Chart, domain: [Date, Date]) {
          if (isDestroyingRef.current || !chartRef.current) {
            return
          }
          try {
            originalOnZoom.call(this, domain)
          } catch {
            // ignore errors if chart is being destroyed
          }
        },
      }
    }

    // Translation tools (Google Translate, Immersive Translate etc.) can
    // rewrite the SVG internals mid-session, which makes billboard.js throw
    // during re-render. Keep the page alive instead of crashing to the
    // route-level ErrorBoundary, but still report the error.
    let chart: Chart | null = null
    try {
      chart = billboard.generate(wrappedOptions)
    } catch (reason) {
      containerRef.current.replaceChildren()
      trackError({
        name: `BillboardChart: ${reason instanceof Error ? reason.message : String(reason)}`,
        message: reason instanceof Error ? reason.message : String(reason),
        lineno: 0,
        colno: 0,
        stackTrace: reason instanceof Error ? reason.stack || '' : '',
      })
    }
    chartRef.current = chart

    if (chart && dataNames) {
      try {
        chart.data.names(dataNames)
      } catch {
        // ignore
      }
    }

    if (onReady) onReady(chart)

    return () => {
      const chartToDestroy = chartRef.current
      if (!chartToDestroy) return

      isDestroyingRef.current = true
      chartRef.current = null

      // Destroy synchronously - the wrapped callbacks will check isDestroyingRef
      // to prevent accessing chart internals during destruction
      try {
        chartToDestroy.destroy()
      } catch {
        // ignore destroy errors
      }

      // Keep isDestroyingRef true until next tick to catch any queued resize events
      // from billboard.js's internal handlers that may fire after destroy
      queueMicrotask(() => {
        isDestroyingRef.current = false
      })

      if (onReady) onReady(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, mergedDeps)

  // translate='no' + notranslate: page translators rewriting SVG <text> nodes
  // break billboard.js's tick measurement (getBBox on a non-SVG element)
  return (
    <div
      ref={containerRef}
      translate='no'
      className={cx('notranslate', className)}
    />
  )
}

export default BillboardChart
