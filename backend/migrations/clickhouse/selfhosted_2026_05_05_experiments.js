const { queriesRunner, dbName } = require('./setup')

const queries = [
  `ALTER TABLE ${dbName}.feature_flag ADD COLUMN IF NOT EXISTS experimentId Nullable(String) AFTER enabled;`,

  `CREATE TABLE IF NOT EXISTS ${dbName}.experiment
  (
    id String,
    name String,
    description Nullable(String),
    hypothesis Nullable(String),
    status Enum8('draft' = 1, 'running' = 2, 'paused' = 3, 'completed' = 4) DEFAULT 'draft',
    exposureTrigger Enum8('feature_flag' = 1, 'custom_event' = 2) DEFAULT 'feature_flag',
    customEventName Nullable(String),
    multipleVariantHandling Enum8('exclude' = 1, 'first_exposure' = 2) DEFAULT 'exclude',
    filterInternalUsers Int8 DEFAULT 1,
    featureFlagMode Enum8('create' = 1, 'link' = 2) DEFAULT 'create',
    featureFlagKey Nullable(String),
    startedAt Nullable(DateTime('UTC')),
    endedAt Nullable(DateTime('UTC')),
    projectId FixedString(12),
    goalId Nullable(String),
    featureFlagId Nullable(String),
    created DateTime('UTC')
  )
  ENGINE = MergeTree()
  ORDER BY (projectId, created, id)
  PARTITION BY toYYYYMM(created);`,

  `CREATE TABLE IF NOT EXISTS ${dbName}.experiment_variant
  (
    id String,
    experimentId String,
    name String,
    key String,
    description Nullable(String),
    rolloutPercentage UInt8 DEFAULT 50,
    isControl Int8 DEFAULT 0
  )
  ENGINE = MergeTree()
  ORDER BY (experimentId, key, id);`,

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
