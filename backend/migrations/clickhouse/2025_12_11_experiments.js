const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Experiment exposures table for tracking which variant each user sees
  `CREATE TABLE IF NOT EXISTS ${dbName}.experiment_exposures
  (
    pid FixedString(12),
    experimentId String,
    variantKey String,
    profileId String,
    created DateTime('UTC')
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, experimentId, created)
  TTL created + INTERVAL 1 YEAR;`,
]

queriesRunner(queries)
