const { queriesRunner, dbName } = require('./setup')

const queries = [
  `CREATE TABLE IF NOT EXISTS ${dbName}.sfuser
  (
    id String,
    timezone Nullable(String),
    timeFormat Nullable(String)
  )
  ENGINE = MergeTree()
  PRIMARY KEY id;`,
]

queriesRunner(queries)
