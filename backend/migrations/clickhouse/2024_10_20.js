const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Added 'brv' and 'osv' columns (browser version and os version)
  `ALTER TABLE ${dbName}.analytics ADD COLUMN brv Nullable(String) AFTER br`,
  `ALTER TABLE ${dbName}.analytics ADD COLUMN osv Nullable(String) AFTER os`,

  `ALTER TABLE ${dbName}.customEV ADD COLUMN brv Nullable(String) AFTER br`,
  `ALTER TABLE ${dbName}.customEV ADD COLUMN osv Nullable(String) AFTER os`,

  `ALTER TABLE ${dbName}.errors ADD COLUMN brv Nullable(String) AFTER br`,
  `ALTER TABLE ${dbName}.errors ADD COLUMN osv Nullable(String) AFTER os`,

  `ALTER TABLE ${dbName}.performance ADD COLUMN brv Nullable(String) AFTER br`,
]

queriesRunner(queries)
