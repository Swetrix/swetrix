const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Bot block events table for advanced bot protection reporting
  `CREATE TABLE IF NOT EXISTS ${dbName}.bot_blocks
  (
    pid FixedString(12),
    reason LowCardinality(String),
    cc Nullable(FixedString(2)),
    created DateTime('UTC') CODEC(Delta(4), LZ4)
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, created)
  TTL created + INTERVAL 90 DAY;`,
]

queriesRunner(queries)
