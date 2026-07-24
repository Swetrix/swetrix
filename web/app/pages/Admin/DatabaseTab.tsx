import { Text } from '~/ui/Text'
import { nFormatter, nLocaleFormatter } from '~/utils/generic'

import {
  AdminTable,
  formatBytes,
  StatCard,
  Td,
  UsageBar,
  useAdminSort,
} from './components'
import type { AdminDatabaseInfo } from './types'

interface DatabaseTabProps {
  database: AdminDatabaseInfo
}

export const DatabaseTab = ({ database }: DatabaseTabProps) => {
  const { clickhouse, mysql } = database

  const clickhouseSort = useAdminSort<
    AdminDatabaseInfo['clickhouse']['tables'][number]
  >([], { by: 'compressedBytes', order: 'DESC' }, () => {}, {
    table: (table) => table.table,
    rows: (table) => table.rows,
    compressedBytes: (table) => table.compressedBytes,
    uncompressedBytes: (table) => table.uncompressedBytes,
    ratio: (table) =>
      table.compressedBytes > 0
        ? table.uncompressedBytes / table.compressedBytes
        : 0,
    parts: (table) => table.parts,
  })

  const mysqlSort = useAdminSort<AdminDatabaseInfo['mysql']['tables'][number]>(
    [],
    { by: 'dataBytes', order: 'DESC' },
    () => {},
    {
      tableName: (table) => table.tableName,
      estimatedRows: (table) => table.estimatedRows,
      dataBytes: (table) => table.dataBytes,
      indexBytes: (table) => table.indexBytes,
    },
  )

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
          columns={[
            { key: 'table', label: 'Table', sortable: true },
            { key: 'rows', label: 'Rows', sortable: true },
            { key: 'compressedBytes', label: 'Compressed', sortable: true },
            { key: 'uncompressedBytes', label: 'Uncompressed', sortable: true },
            { key: 'ratio', label: 'Ratio', sortable: true },
            { key: 'parts', label: 'Parts', sortable: true },
          ]}
          sort={clickhouseSort.sort}
          onSort={clickhouseSort.onSort}
        >
          {clickhouseSort.sortRows(clickhouse.tables).map((table) => (
            <tr key={table.table}>
              <Td>{table.table}</Td>
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

        <AdminTable
          columns={[
            { key: 'tableName', label: 'Table', sortable: true },
            { key: 'estimatedRows', label: 'Est. rows', sortable: true },
            { key: 'dataBytes', label: 'Data', sortable: true },
            { key: 'indexBytes', label: 'Indexes', sortable: true },
          ]}
          sort={mysqlSort.sort}
          onSort={mysqlSort.onSort}
        >
          {mysqlSort.sortRows(mysql.tables).map((table) => (
            <tr key={table.tableName}>
              <Td>{table.tableName}</Td>
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
