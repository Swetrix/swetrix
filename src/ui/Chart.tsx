import React, { useEffect } from 'react'
import bb from 'billboard.js'
import 'billboard.js/dist/theme/datalab.css'
import 'billboard.js/dist/billboard.css'

const Chart = ({ current, children, options }: {
  current: string,
  children: React.ReactNode,
  options: any,
}): JSX.Element => {
  let chartInstance: any = {}

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

  const renderChart = () => {
    if (current !== null) {
      chartInstance = bb.generate({
        ...options,
        bindto: `#${current}`,
      })
    }
  }

  useEffect(() => {
    renderChart()
    return destroy
  })

  return (
    <div>
      <div id={current} />
      {children}
    </div>
  )
}

export default Chart
