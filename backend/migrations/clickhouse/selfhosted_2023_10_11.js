const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Made 'showLiveVisitorsInTitle' column nullable
  `DROP TABLE IF EXISTS ${dbName}.sfuser_temp`,
  `CREATE TABLE IF NOT EXISTS ${dbName}.sfuser_temp
  (
    id String,
    timezone Nullable(String),
    timeFormat Nullable(String),
    showLiveVisitorsInTitle Nullable(Int8)
  )
  ENGINE = MergeTree()
  PRIMARY KEY id;`,

  `INSERT INTO ${dbName}.sfuser_temp (*)
  SELECT id, timezone, timeFormat, showLiveVisitorsInTitle FROM ${dbName}.sfuser`,

  `DROP TABLE ${dbName}.sfuser`,
  `RENAME TABLE ${dbName}.sfuser_temp TO ${dbName}.sfuser`,
]

queriesRunner(queries)
