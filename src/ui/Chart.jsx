import React from 'react'
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
} from 'chart.js'
import randomColor from 'randomcolor'
// eslint-disable-next-line import/no-unresolved
import { Doughnut } from 'react-chartjs-2'

import { useSelector } from 'react-redux'

ChartJS.register(ArcElement, Tooltip, Legend)

const Chart = ({
  children, data, callbacks,
}) => {
  const theme = useSelector((state) => state.ui.theme.theme)

  const colors = randomColor({
    count: data.labels.length,
    // hue: theme === 'dark' ? 'purple' : 'blue',
    luminosity: 'light',
    format: 'rgba',
    alpha: 0.6,
  })

  const plugins = {
    legend: {
      display: true,
      labels: {
        color: theme === 'dark' ? '#c0d6d9' : '#1e2a2f',
        font: { weight: 500, size: 11, family: "'Inter', 'Cantarell', 'Roboto', 'Oxygen', 'Ubuntu', 'sans-serif'" },
        usePointStyle: true,
      },
      onHover: (evt, item, legend) => {
        const { chart } = legend

        chart.canvas.style.cursor = 'pointer'
      },
      onLeave: (evt, item, legend) => {
        const { chart } = legend

        chart.canvas.style.cursor = 'default'
      },
    },
    tooltip: {
      enabled: true,
      backgroundColor: theme === 'dark' ? 'rgb(75 85 99)' : 'rgb(255 255 255)',
      titleFont: {
        family: "'Inter', 'Cantarell', 'Roboto', 'Oxygen', 'Ubuntu', 'sans-serif'",
        size: 13,
        weight: 700,
      },
      titleColor: theme === 'dark' ? 'rgb(255 255 255)' : 'rgb(0 0 0)',
      titleSpacing: 4,
      bodyColor: theme === 'dark' ? 'rgb(255 255 255)' : 'rgb(0 0 0)',
      bodyFont: {
        family: "'Inter', 'Cantarell', 'Roboto', 'Oxygen', 'Ubuntu', 'sans-serif'",
        size: 13,
        weight: 500,
      },
      bodySpacing: 4,
      cornerRadius: 6,
      displayColors: false,
      usePointStyle: true,
      callbacks: {
        label: (context) => {
          return callbacks(context)
        },
      },
    },
  }

  return (
    <div>
      <Doughnut
        style={{ minHeight: '350px' }}
        data={{
          labels: data.labels,
          datasets: [{
            ...data.datasets,
            backgroundColor: colors,
            borderColor: colors,
            hoverBorderWidth: 13,
          }],
        }}
        options={{
          // responsive: true,
          maintainAspectRatio: false,
          aspectRatio: 2,
          layout: {
            padding: {
              top: 0,
              bottom: 6,
            },
          },
          plugins,
        }}
      />
      {children}
    </div>
  )
}

export default Chart
