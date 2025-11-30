// This migration adds the countryBlacklist column to the project table
const { queriesRunner, dbName } = require('./setup')

const queries = [
  `ALTER TABLE ${dbName}.project ADD COLUMN countryBlacklist Nullable(String) DEFAULT NULL AFTER ipBlacklist;`,
]

queriesRunner(queries)
