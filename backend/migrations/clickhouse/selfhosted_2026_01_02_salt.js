// This migration creates the salt table
const { queriesRunner, dbName } = require('./setup')

const queries = [
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

queriesRunner(queries)
