const { queriesRunner, dbName } = require('./setup')

const queries = [
  `CREATE TABLE IF NOT EXISTS ${dbName}.data_import
  (
    id UInt8,
    projectId FixedString(12),
    provider LowCardinality(String),
    status Enum8('pending' = 1, 'processing' = 2, 'completed' = 3, 'failed' = 4) DEFAULT 'pending',
    dateFrom Nullable(Date),
    dateTo Nullable(Date),
    totalRows UInt32 DEFAULT 0,
    importedRows UInt32 DEFAULT 0,
    invalidRows UInt32 DEFAULT 0,
    errorMessage Nullable(String) CODEC(ZSTD(3)),
    createdAt DateTime('UTC') DEFAULT now(),
    finishedAt Nullable(DateTime('UTC')),
    version UInt32 DEFAULT 1
  )
  ENGINE = ReplacingMergeTree(version)
  ORDER BY (projectId, id);`,
]

queriesRunner(queries)
