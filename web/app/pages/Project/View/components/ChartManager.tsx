import { Chart } from 'billboard.js'
import React, {
  createContext,
  useContext,
  useRef,
  useCallback,
  ReactNode,
} from 'react'

interface ChartManagerContextType {
  registerChart: (id: string, chart: Chart | null) => void
  unregisterChart: (id: string) => void
  getChart: (id: string) => Chart | null
  destroyChart: (id: string) => void
  destroyAllCharts: () => void
}

const ChartManagerContext = createContext<ChartManagerContextType | null>(null)

export const useChartManager = () => {
  const context = useContext(ChartManagerContext)
  if (!context) {
    throw new Error(
      'useChartManager must be used within a ChartManagerProvider',
    )
  }
  return context
}

interface ChartManagerProviderProps {
  children: ReactNode
}

export const ChartManagerProvider = ({
  children,
}: ChartManagerProviderProps) => {
  const chartsRef = useRef<Map<string, Chart>>(new Map())

  const registerChart = useCallback((id: string, chart: Chart | null) => {
    if (chart) {
      chartsRef.current.set(id, chart)
    } else {
      chartsRef.current.delete(id)
    }
  }, [])

  const unregisterChart = useCallback((id: string) => {
    chartsRef.current.delete(id)
  }, [])

  const getChart = useCallback((id: string) => {
    return chartsRef.current.get(id) || null
  }, [])

  const destroyChart = useCallback((id: string) => {
    const chart = chartsRef.current.get(id)
    if (chart) {
      try {
        chart.destroy()
      } catch {
        // ignore destroy errors
      }
      chartsRef.current.delete(id)
    }
  }, [])

  const destroyAllCharts = useCallback(() => {
    chartsRef.current.forEach((chart) => {
      try {
        chart.destroy()
      } catch {
        // ignore destroy errors
      }
    })
    chartsRef.current.clear()
  }, [])

  const value: ChartManagerContextType = {
    registerChart,
    unregisterChart,
    getChart,
    destroyChart,
    destroyAllCharts,
  }

  return (
    <ChartManagerContext.Provider value={value}>
      {children}
    </ChartManagerContext.Provider>
  )
}
