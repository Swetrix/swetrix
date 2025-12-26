import React from 'react'
import { Text, Box } from 'ink'

interface Column<T> {
  key: string
  header: string
  width?: number
  render?: (row: T) => string
}

interface TableProps<T> {
  data: T[]
  columns: Column<T>[]
}

export function Table<T>({ data, columns }: TableProps<T>) {
  // Calculate column widths
  const columnWidths = columns.map(col => {
    if (col.width) return col.width
    const headerLen = col.header.length
    const maxDataLen = data.reduce((max, row) => {
      const value = col.render 
        ? col.render(row) 
        : String((row as Record<string, unknown>)[col.key] ?? '')
      return Math.max(max, value.length)
    }, 0)
    return Math.max(headerLen, maxDataLen) + 2
  })

  const totalWidth = columnWidths.reduce((sum, w) => sum + w, 0) + columns.length + 1

  const renderSeparator = (char: string, leftCorner: string, midCorner: string, rightCorner: string) => {
    const line = columnWidths.map(w => char.repeat(w)).join(midCorner)
    return `${leftCorner}${line}${rightCorner}`
  }

  const renderRow = (cells: string[]) => {
    const paddedCells = cells.map((cell, i) => {
      const width = columnWidths[i]
      return ` ${cell.padEnd(width - 1)}`
    })
    return `│${paddedCells.join('│')}│`
  }

  return (
    <Box flexDirection="column">
      {/* Top border */}
      <Text color="gray">{renderSeparator('─', '┌', '┬', '┐')}</Text>
      
      {/* Header */}
      <Text color="cyan" bold>
        {renderRow(columns.map(c => c.header))}
      </Text>
      
      {/* Header separator */}
      <Text color="gray">{renderSeparator('─', '├', '┼', '┤')}</Text>
      
      {/* Data rows */}
      {data.length === 0 ? (
        <Text color="gray">
          {'│'}{' No data found'.padEnd(totalWidth - 2)}{'│'}
        </Text>
      ) : (
        data.map((row, i) => (
          <Text key={i}>
            {renderRow(columns.map(col => {
              if (col.render) return col.render(row)
              const value = (row as Record<string, unknown>)[col.key]
              return String(value ?? '')
            }))}
          </Text>
        ))
      )}
      
      {/* Bottom border */}
      <Text color="gray">{renderSeparator('─', '└', '┴', '┘')}</Text>
    </Box>
  )
}
