// This migration adds the annotation table for self-hosted instances
const { queriesRunner, dbName } = require('./setup')

const queries = [
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

queriesRunner(queries)
