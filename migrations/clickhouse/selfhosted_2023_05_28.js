const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Added 'showLiveVisitorsInTitle' column
  `DROP TABLE IF EXISTS ${dbName}.sfuser_temp`,
  `CREATE TABLE IF NOT EXISTS ${dbName}.sfuser_temp
  (
    id String,
    timezone Nullable(String),
    timeFormat Nullable(String)
    showLiveVisitorsInTitle Int8
  )
  ENGINE = MergeTree()
  PRIMARY KEY id;`,

  `INSERT INTO ${dbName}.sfuser_temp (*)
  SELECT id, timezone, timeFormat, 0 FROM ${dbName}.sfuser`,

  `DROP TABLE ${dbName}.sfuser`,
  `RENAME TABLE ${dbName}.sfuser_temp TO ${dbName}.sfuser`,
]

queriesRunner(queries)
