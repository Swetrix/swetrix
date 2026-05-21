const { queriesRunner, dbName } = require('./setup')

const queries = [
  `ALTER TABLE ${dbName}.goal ADD COLUMN IF NOT EXISTS conditions Nullable(String) AFTER metadataFilters;`,
]

queriesRunner(queries)
