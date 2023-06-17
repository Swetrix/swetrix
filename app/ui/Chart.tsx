import React, { useEffect } from 'react'
import bb from 'billboard.js'
import 'billboard.js/dist/theme/datalab.css'
import 'billboard.js/dist/billboard.css'

// Define the prop types for the component
interface IChart {
  // (string): The ID of the chart container.
  current: string,
  // (object): The chart options.
  options: any,
}

const Chart = ({ current, options }: IChart): JSX.Element => {
  let chartInstance: any = {}

  // Destroy the chart instance
  const destroy = () => {
    if (chartInstance !== null) {
      try {
        chartInstance.destroy()
      } catch (error) {
        console.error('[ERROR] Internal billboard.js error', error)
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

  return (
    <div>
      <div id={current} data-testid='chart' />
    </div>
  )
}

export default Chart
