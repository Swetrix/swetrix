const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Add region code column
  `ALTER TABLE ${dbName}.analytics ADD COLUMN IF NOT EXISTS rgc Nullable(String) AFTER rg`,
  `ALTER TABLE ${dbName}.customEV ADD COLUMN IF NOT EXISTS rgc Nullable(String) AFTER rg`,
  `ALTER TABLE ${dbName}.errors ADD COLUMN IF NOT EXISTS rgc Nullable(String) AFTER rg`,
  `ALTER TABLE ${dbName}.performance ADD COLUMN IF NOT EXISTS rgc Nullable(String) AFTER rg`,
]

queriesRunner(queries)
