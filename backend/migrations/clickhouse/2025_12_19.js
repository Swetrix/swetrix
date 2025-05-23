const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Add stackTrace column to errors table
  `ALTER TABLE ${dbName}.errors ADD COLUMN IF NOT EXISTS stackTrace Nullable(String) AFTER message`,

  // Add meta columns to errors table
  `ALTER TABLE ${dbName}.errors ADD COLUMN IF NOT EXISTS meta Nested(
    key String,
    value String
  ) AFTER stackTrace`,
]

queriesRunner(queries)
