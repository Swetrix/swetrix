import type { ChartOptions } from 'billboard.js'
import { area } from 'billboard.js'
import React, { useMemo, memo } from 'react'

import { OverallChart } from '~/lib/models/Project'
import BillboardChart from '~/ui/BillboardChart'

interface SparklineProps {
  chart?: OverallChart
  className?: string
}

const Sparkline = memo(({ chart, className }: SparklineProps) => {
  // Check if there's any meaningful data (at least one non-zero value)
  const hasData = useMemo(() => {
    if (!chart || !chart.visits || chart.visits.length === 0) {
      return false
    }
    return chart.visits.some((value) => value > 0)
  }, [chart])

  const options: ChartOptions = useMemo(() => {
    if (!hasData) {
      return null as unknown as ChartOptions
    }

    return {
      data: {
        columns: [['visits', ...(chart?.visits || [])]],
        type: area(),
        colors: {
          visits: 'rgb(99, 102, 241)', // indigo-500
        },
      },
      area: {
        linearGradient: {
          x: [0, 0],
          y: [0, 1],
          stops: [
            [0, 'rgba(99, 102, 241, 0.3)', 1],
            [1, 'rgba(99, 102, 241, 0.05)', 1],
          ],
        },
      },
      point: {
        show: false,
      },
      line: {
        classes: ['sparkline-line'],
      },
      axis: {
        x: {
          show: false,
        },
        y: {
          show: false,
        },
      },
      legend: {
        show: false,
      },
      tooltip: {
        show: false,
      },
      padding: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
      size: {
        height: 60,
      },
      interaction: {
        enabled: false,
      },
    }
  }, [chart, hasData])

  if (!hasData || !options) {
    return null
  }

  return <BillboardChart options={options} className={className} deps={[chart]} />
})

Sparkline.displayName = 'Sparkline'

export default Sparkline
