import React, { useState, useEffect } from 'react'
import { Box, Text } from 'ink'
import { Spinner } from '../components/Spinner.js'
import { Table } from '../components/Table.js'
import { getClickHouseStats, ClickHouseStats, TableStats } from '../db/clickhouse.js'

interface StatsCommandProps {
  onBack: () => void
}

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`
  }
  return num.toString()
}

export function StatsCommand({ onBack }: StatsCommandProps) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ClickHouseStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const result = await getClickHouseStats()
        setStats(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load ClickHouse stats')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return <Spinner text="Fetching ClickHouse statistics..." />
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
        <Text color="gray">Press ESC to go back</Text>
      </Box>
    )
  }

  if (!stats) {
    return <Text color="gray">No statistics available</Text>
  }

  const totalBytes = stats.tables.reduce((sum, t) => sum + t.bytes, 0)
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  const filteredTables = stats.tables.filter(t => t.rows > 0 || t.bytes > 0)
  const emptyTables = stats.tables.filter(t => t.rows === 0 && t.bytes === 0)

  return (
    <Box flexDirection="column">
      <Text bold color="yellow">📊 ClickHouse Statistics</Text>
      
      {/* Summary */}
      <Box flexDirection="column" marginTop={1} marginBottom={1} paddingX={1}>
        <Text>
          <Text color="cyan" bold>Total Events:</Text>{' '}
          <Text color="green" bold>{stats.totalEvents.toLocaleString()}</Text>
          <Text color="gray"> ({formatNumber(stats.totalEvents)})</Text>
        </Text>
        <Text>
          <Text color="cyan" bold>Total Size:</Text>{' '}
          <Text color="green" bold>{formatBytes(totalBytes)}</Text>
        </Text>
      </Box>

      {/* Per-table breakdown */}
      <Box marginBottom={1}>
        <Text bold>Table Breakdown:</Text>
      </Box>
      
      <Table<TableStats>
        data={filteredTables}
        columns={[
          { 
            key: 'table', 
            header: 'Table', 
            width: 28,
          },
          { 
            key: 'rows', 
            header: 'Rows', 
            width: 15,
            render: (t) => t.rows.toLocaleString()
          },
          { 
            key: 'size', 
            header: 'Size', 
            width: 12,
            render: (t) => t.bytesFormatted
          },
        ]}
      />

      {/* Tables with no data */}
      {emptyTables.length > 0 && (
        <Box marginTop={1}>
          <Text color="gray">
            Empty tables: {emptyTables.map(t => t.table).join(', ')}
          </Text>
        </Box>
      )}
    </Box>
  )
}
