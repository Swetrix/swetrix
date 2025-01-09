const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Added 'hostname' column
  `ALTER TABLE ${dbName}.analytics ADD COLUMN hostname Nullable(String) AFTER pid`,

  `ALTER TABLE ${dbName}.customEV ADD COLUMN hostname Nullable(String) AFTER pid`,

  `ALTER TABLE ${dbName}.errors ADD COLUMN hostname Nullable(String) AFTER pid`,

  `ALTER TABLE ${dbName}.performance ADD COLUMN hostname Nullable(String) AFTER pid`,
]

queriesRunner(queries)
