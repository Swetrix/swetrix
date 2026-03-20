const { queriesRunner, dbName } = require('./setup')

const tables = ['analytics', 'customEV', 'performance', 'errors']

const queries = tables.flatMap((table) => [
  `ALTER TABLE ${dbName}.${table} ADD COLUMN IF NOT EXISTS isp LowCardinality(Nullable(String)) AFTER ct`,
  `ALTER TABLE ${dbName}.${table} ADD COLUMN IF NOT EXISTS og Nullable(String) CODEC(ZSTD(3)) AFTER isp`,
  `ALTER TABLE ${dbName}.${table} ADD COLUMN IF NOT EXISTS ut LowCardinality(Nullable(String)) AFTER og`,
  `ALTER TABLE ${dbName}.${table} ADD COLUMN IF NOT EXISTS ctp LowCardinality(Nullable(String)) AFTER ut`,
])

queriesRunner(queries)
