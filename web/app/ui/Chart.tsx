import React, { useEffect } from 'react'
import bb from 'billboard.js'
import 'billboard.js/dist/theme/datalab.css?url'
import 'billboard.js/dist/billboard.css?url'

// Define the prop types for the component
interface ChartProps {
  // (string): The ID of the chart container.
  current: string
  // (object): The chart options.
  options: any
}

const Chart = ({ current, options }: ChartProps) => {
  let chartInstance: any = {}

  // Destroy the chart instance
  const destroy = () => {
    if (chartInstance !== null) {
      try {
        chartInstance.destroy()
      } catch (reason) {
        console.error('[ERROR] Internal billboard.js error', reason)
      } finally {
        chartInstance = null
      }
    }
  }

  // Render the chart
  const renderChart = () => {
    if (current !== null) {
      chartInstance = bb.generate({
        ...options,
        bindto: `#${current}`,
      })
    }
  }

  // Render the chart on mount
  useEffect(() => {
    renderChart()
    return destroy
  })

  return <div id={current} />
}

export default Chart
