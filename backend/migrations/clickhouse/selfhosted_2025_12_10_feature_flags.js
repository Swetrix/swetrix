// This migration adds feature flags support for self-hosted instances
const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Create feature_flag table for storing feature flag definitions
  `CREATE TABLE IF NOT EXISTS ${dbName}.feature_flag
  (
    id String,
    key String,
    description Nullable(String),
    flagType Enum8('boolean' = 1, 'rollout' = 2) DEFAULT 'boolean',
    rolloutPercentage UInt8 DEFAULT 100,
    targetingRules Nullable(String),
    enabled Int8 DEFAULT 1,
    projectId FixedString(12),
    created DateTime('UTC')
  )
  ENGINE = ReplacingMergeTree(created)
  ORDER BY (projectId, id)
  PARTITION BY toYYYYMM(created);`,

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
