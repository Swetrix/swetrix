// This script initialises the Swetrix selfhosted edition database and tables if they're absent
const { queriesRunner, dbName } = require('./setup')
const { initialiseDatabase } = require('./initialise_database')

const CLICKHOUSE_INIT_QUERIES = [
  `CREATE TABLE IF NOT EXISTS ${dbName}.user
  (
    id FixedString(36),
    email String CODEC(ZSTD(3)),
    password String CODEC(ZSTD(3)),
    timezone String CODEC(ZSTD(3)),
    timeFormat String CODEC(ZSTD(3)),
    showLiveVisitorsInTitle Int8,
    onboardingStep String CODEC(ZSTD(3)),
    hasCompletedOnboarding Int8,
    apiKey Nullable(String) CODEC(ZSTD(3))
  )
  ENGINE = MergeTree()
  PRIMARY KEY id;`,

  `CREATE TABLE IF NOT EXISTS ${dbName}.project
  (
    id FixedString(12),
    name String CODEC(ZSTD(3)),
    origins Nullable(String) CODEC(ZSTD(3)),
    ipBlacklist Nullable(String) CODEC(ZSTD(3)),
    countryBlacklist Nullable(String) CODEC(ZSTD(3)),
    active Int8,
    public Int8,
    isPasswordProtected Int8,
    botsProtectionLevel String CODEC(ZSTD(3)) DEFAULT 'basic',
    passwordHash Nullable(String) CODEC(ZSTD(3)),
    adminId Nullable(String) CODEC(ZSTD(3)),
    websiteUrl Nullable(String) CODEC(ZSTD(3)),
    created DateTime CODEC(Delta(4), LZ4)
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (created);`,

  `CREATE TABLE IF NOT EXISTS ${dbName}.pinned_project
  (
    id String,
    visitorId String,
    projectId FixedString(12),
    created DateTime('UTC')
  )
  ENGINE = ReplacingMergeTree(created)
  ORDER BY (visitorId, projectId)
  PARTITION BY toYYYYMM(created);`,

  `CREATE TABLE IF NOT EXISTS ${dbName}.goal
  (
    id FixedString(36),
    name String,
    type Enum8('pageview' = 1, 'custom_event' = 2),
    matchType Enum8('exact' = 1, 'contains' = 2, 'regex' = 3) DEFAULT 'exact',
    value Nullable(String),
    metadataFilters Nullable(String),
    active Int8 DEFAULT 1,
    projectId FixedString(12),
    created DateTime
  )
  ENGINE = MergeTree()
  PRIMARY KEY id;`,

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

  `CREATE TABLE IF NOT EXISTS ${dbName}.refresh_token
  (
    userId String CODEC(ZSTD(3)),
    refreshToken String CODEC(ZSTD(3))
  )
  ENGINE = MergeTree()
  ORDER BY userId;`,

  `CREATE TABLE IF NOT EXISTS ${dbName}.funnel
  (
    id String CODEC(ZSTD(3)),
    name String CODEC(ZSTD(3)),
    steps String CODEC(ZSTD(3)),
    projectId FixedString(12),
    created DateTime CODEC(Delta(4), LZ4)
  )
  ENGINE = MergeTree()
  PRIMARY KEY id;`,

  `CREATE TABLE IF NOT EXISTS ${dbName}.project_views
  (
    id FixedString(36),
    projectId FixedString(12),
    name String CODEC(ZSTD(3)),
    type String CODEC(ZSTD(3)),
    filters Nullable(String) CODEC(ZSTD(3)),
    createdAt DateTime CODEC(Delta(4), LZ4),
    updatedAt DateTime CODEC(Delta(4), LZ4)
  )
  ENGINE = MergeTree()
  PRIMARY KEY id;`,

  `CREATE TABLE IF NOT EXISTS ${dbName}.projects_views_custom_events
  (
    id FixedString(36),
    viewId FixedString(36),
    customEventName String CODEC(ZSTD(3)),
    metaKey Nullable(String) CODEC(ZSTD(3)),
    metaValue Nullable(String) CODEC(ZSTD(3)),
    metricKey String CODEC(ZSTD(3)),
    metaValueType String CODEC(ZSTD(3))
  )
  ENGINE = MergeTree()
  PRIMARY KEY id;`,

  `CREATE TABLE IF NOT EXISTS ${dbName}.project_share
  (
    id FixedString(36),
    userId FixedString(36),
    projectId FixedString(12),
    role String CODEC(ZSTD(3)),
    confirmed Int8,
    created DateTime CODEC(Delta(4), LZ4),
    updated DateTime CODEC(Delta(4), LZ4)
  )
  ENGINE = MergeTree()
  PRIMARY KEY id;`,

  `CREATE TABLE IF NOT EXISTS ${dbName}.annotation
  (
    id FixedString(36),
    projectId FixedString(12),
    date Date,
    text String CODEC(ZSTD(3)),
    created DateTime CODEC(Delta(4), LZ4)
  )
  ENGINE = MergeTree()
  PRIMARY KEY id;`,

  `CREATE TABLE IF NOT EXISTS ${dbName}.salt
  (
    rotation String CODEC(ZSTD(3)),
    salt String CODEC(ZSTD(3)),
    expiresAt DateTime CODEC(Delta(4), LZ4),
    created DateTime CODEC(Delta(4), LZ4)
  )
  ENGINE = MergeTree()
  PRIMARY KEY rotation;`,
]

const initialiseSelfhosted = async () => {
  try {
    await initialiseDatabase()
    await queriesRunner(CLICKHOUSE_INIT_QUERIES)
  } catch (reason) {
    console.error(
      `[ERROR] Error occured whilst initialising the database: ${reason}`,
    )
  }
}

initialiseSelfhosted()
