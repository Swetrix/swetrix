const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Added 'psid' column to errors table
  `ALTER TABLE ${dbName}.errors ADD COLUMN IF NOT EXISTS psid Nullable(UInt64) FIRST`,
]

queriesRunner(queries)
