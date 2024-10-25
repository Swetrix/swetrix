const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Added 'te' / 'co' columns
  `ALTER TABLE ${dbName}.analytics ADD COLUMN te Nullable(String) AFTER ca`,
  `ALTER TABLE ${dbName}.analytics ADD COLUMN co Nullable(String) AFTER te`,

  `ALTER TABLE ${dbName}.customEV ADD COLUMN te Nullable(String) AFTER ca`,
  `ALTER TABLE ${dbName}.customEV ADD COLUMN co Nullable(String) AFTER te`,
]

queriesRunner(queries)
