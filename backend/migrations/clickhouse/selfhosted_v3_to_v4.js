const { queriesRunner, dbName } = require('./setup')

const queries = [
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

  `DROP TABLE IF EXISTS ${dbName}.sfuser`,

  `ALTER TABLE ${dbName}.project ADD COLUMN adminId Nullable(String) AFTER passwordHash`,

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
]

async function runMigrations() {
  try {
    await queriesRunner(queries)
    console.log('[INFO] SWETRIX CE V4 - MIGRATIONS FINISHED')
  } catch (reason) {
    console.error('Error running migration:', reason)
  }
}

runMigrations()
