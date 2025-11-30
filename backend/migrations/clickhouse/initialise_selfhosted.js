// This script initialises the Swetrix cloud edition database and tables if they're absent
const { queriesRunner, dbName } = require('./setup')
const { initialiseDatabase } = require('./initialise_database')

const CLICKHOUSE_INIT_QUERIES = [
  `CREATE TABLE IF NOT EXISTS ${dbName}.user
  (
    id FixedString(36),
    email String,
    password String,
    timezone String,
    timeFormat String,
    showLiveVisitorsInTitle Int8,
    onboardingStep String,
    hasCompletedOnboarding Int8,
    apiKey Nullable(String)
  )
  ENGINE = MergeTree()
  PRIMARY KEY id;`,

  `CREATE TABLE IF NOT EXISTS ${dbName}.project
  (
    id FixedString(12),
    name String,
    origins Nullable(String),
    ipBlacklist Nullable(String),
    countryBlacklist Nullable(String),
    active Int8,
    public Int8,
    isPasswordProtected Int8,
    botsProtectionLevel String DEFAULT 'basic',
    passwordHash Nullable(String),
    adminId Nullable(String),
    created DateTime
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (created);`,

  `CREATE TABLE IF NOT EXISTS ${dbName}.refresh_token
  (
    userId String,
    refreshToken String
  )
  ENGINE = MergeTree()
  ORDER BY userId;`,

  `CREATE TABLE IF NOT EXISTS ${dbName}.funnel
  (
    id String,
    name String,
    steps String,
    projectId FixedString(12),
    created DateTime
  )
  ENGINE = MergeTree()
  PRIMARY KEY id;`,

  `CREATE TABLE IF NOT EXISTS ${dbName}.project_views
  (
    id FixedString(36),
    projectId FixedString(12),
    name String,
    type String,
    filters Nullable(String),
    createdAt DateTime,
    updatedAt DateTime
  )
  ENGINE = MergeTree()
  PRIMARY KEY id;`,

  `CREATE TABLE IF NOT EXISTS ${dbName}.projects_views_custom_events
  (
    id FixedString(36),
    viewId FixedString(36),
    customEventName String,
    metaKey Nullable(String),
    metaValue Nullable(String),
    metricKey String,
    metaValueType String
  )
  ENGINE = MergeTree()
  PRIMARY KEY id;`,

  `CREATE TABLE IF NOT EXISTS ${dbName}.project_share
  (
    id FixedString(36),
    userId FixedString(36),
    projectId FixedString(12),
    role String,
    confirmed Int8,
    created DateTime,
    updated DateTime
  )
  ENGINE = MergeTree()
  PRIMARY KEY id;`,

  `CREATE TABLE IF NOT EXISTS ${dbName}.annotation
  (
    id FixedString(36),
    projectId FixedString(12),
    date Date,
    text String,
    created DateTime
  )
  ENGINE = MergeTree()
  PRIMARY KEY id;`,
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
