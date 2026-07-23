import { Text } from '~/ui/Text'
import { nFormatter, nLocaleFormatter } from '~/utils/generic'

import { AdminTable, formatBytes, StatCard, Td, UsageBar } from './components'
import type { AdminDatabaseInfo } from './types'

interface DatabaseTabProps {
  database: AdminDatabaseInfo
}

export const DatabaseTab = ({ database }: DatabaseTabProps) => {
  const { clickhouse, mysql } = database

  const compressionRatio =
    clickhouse.totalCompressedBytes > 0
      ? (
          clickhouse.totalUncompressedBytes / clickhouse.totalCompressedBytes
        ).toFixed(1)
      : null

  return (
    <div className='flex flex-col gap-8'>
      <section>
        <div className='mb-4 flex items-baseline gap-3'>
          <Text as='h3' size='lg' weight='semibold'>
            ClickHouse
          </Text>
          {clickhouse.version ? (
            <Text as='span' size='sm' colour='secondary'>
              v{clickhouse.version}
            </Text>
          ) : null}
        </div>

        <div className='mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          <StatCard
            label='Total rows'
            value={nFormatter(clickhouse.totalRows, 1)}
            hint={nLocaleFormatter(clickhouse.totalRows)}
          />
          <StatCard
            label='On disk (compressed)'
            value={formatBytes(clickhouse.totalCompressedBytes)}
            hint={
              compressionRatio
                ? `${formatBytes(clickhouse.totalUncompressedBytes)} uncompressed · ${compressionRatio}x ratio`
                : undefined
            }
          />
          {clickhouse.disks.map((disk) => {
            const used = disk.totalSpace - disk.freeSpace

            return (
              <StatCard
                key={disk.name}
                label={`Disk "${disk.name}"`}
                value={`${formatBytes(disk.freeSpace)} free`}
                hint={`${formatBytes(used)} used of ${formatBytes(disk.totalSpace)}`}
              >
                <UsageBar
                  used={used}
                  total={disk.totalSpace}
                  className='mt-2'
                />
              </StatCard>
            )
          })}
        </div>

        <AdminTable
          headers={[
            'Table',
            'Rows',
            'Compressed',
            'Uncompressed',
            'Ratio',
            'Parts',
          ]}
        >
          {clickhouse.tables.map((table) => (
            <tr key={table.table}>
              <Td className='font-mono'>{table.table}</Td>
              <Td className='tabular-nums'>{nLocaleFormatter(table.rows)}</Td>
              <Td className='tabular-nums'>
                {formatBytes(table.compressedBytes)}
              </Td>
              <Td className='tabular-nums'>
                {formatBytes(table.uncompressedBytes)}
              </Td>
              <Td className='tabular-nums'>
                {table.compressedBytes > 0
                  ? `${(table.uncompressedBytes / table.compressedBytes).toFixed(1)}x`
                  : '—'}
              </Td>
              <Td className='tabular-nums'>{table.parts}</Td>
            </tr>
          ))}
        </AdminTable>
      </section>

      <section>
        <div className='mb-4 flex items-baseline gap-3'>
          <Text as='h3' size='lg' weight='semibold'>
            MySQL
          </Text>
          {mysql.version ? (
            <Text as='span' size='sm' colour='secondary'>
              v{mysql.version}
            </Text>
          ) : null}
          <Text as='span' size='sm' colour='secondary'>
            {formatBytes(mysql.totalBytes)} total
          </Text>
        </div>

        <AdminTable headers={['Table', 'Est. rows', 'Data', 'Indexes']}>
          {mysql.tables.map((table) => (
            <tr key={table.tableName}>
              <Td className='font-mono'>{table.tableName}</Td>
              <Td className='tabular-nums'>
                {nLocaleFormatter(table.estimatedRows)}
              </Td>
              <Td className='tabular-nums'>{formatBytes(table.dataBytes)}</Td>
              <Td className='tabular-nums'>{formatBytes(table.indexBytes)}</Td>
            </tr>
          ))}
        </AdminTable>
      </section>
    </div>
  )
}
