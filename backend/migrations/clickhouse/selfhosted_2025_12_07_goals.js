// This migration adds the goal table for conversion tracking
const { queriesRunner, dbName } = require('./setup')

const queries = [
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
]

queriesRunner(queries)
