const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Added 'host' column
  `ALTER TABLE ${dbName}.analytics ADD COLUMN IF NOT EXISTS host Nullable(String) AFTER pid`,

  `ALTER TABLE ${dbName}.customEV ADD COLUMN IF NOT EXISTS host Nullable(String) AFTER pid`,

  `ALTER TABLE ${dbName}.errors ADD COLUMN IF NOT EXISTS host Nullable(String) AFTER pid`,

  `ALTER TABLE ${dbName}.performance ADD COLUMN IF NOT EXISTS host Nullable(String) AFTER pid`,
]

queriesRunner(queries)
