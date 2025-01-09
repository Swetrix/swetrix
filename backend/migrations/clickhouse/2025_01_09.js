const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Added 'host' column
  `ALTER TABLE ${dbName}.analytics ADD COLUMN host Nullable(String) AFTER pid`,

  `ALTER TABLE ${dbName}.customEV ADD COLUMN host Nullable(String) AFTER pid`,

  `ALTER TABLE ${dbName}.errors ADD COLUMN host Nullable(String) AFTER pid`,

  `ALTER TABLE ${dbName}.performance ADD COLUMN host Nullable(String) AFTER pid`,
]

queriesRunner(queries)
