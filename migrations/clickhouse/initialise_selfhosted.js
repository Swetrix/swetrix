// This script initialises the Swetrix cloud edition database and tables if they're absent
const { queriesRunner, dbName } = require('./setup')
const { initialiseDatabase } = require('./initialise_database')

const CLICKHOUSE_INIT_QUERIES = [
  `CREATE TABLE IF NOT EXISTS ${dbName}.project
  (
    id FixedString(12),
    name String,
    origins String,
    active Int8,
    public Int8,
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
]

const initialiseSelfhosted = async () => {
  try {
    await initialiseDatabase()
    await queriesRunner(CLICKHOUSE_INIT_QUERIES)
  } catch (reason) {
    console.error(`[ERROR] Error occured whilst initialising the database: ${reason}`)
  }
}

initialiseSelfhosted()
