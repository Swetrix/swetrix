const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Create feature_flag_evaluations table for tracking flag evaluations
  `CREATE TABLE IF NOT EXISTS ${dbName}.feature_flag_evaluations
  (
    pid FixedString(12),
    flagId String,
    flagKey String,
    result UInt8,
    profileId String,
    created DateTime('UTC')
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, flagId, created)
  TTL created + INTERVAL 1 YEAR;`,
]

queriesRunner(queries)
