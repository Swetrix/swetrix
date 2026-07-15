// This migration adds the ipWhitelist column (IPs excluded from bot
// protection) to the project table
const { queriesRunner, dbName } = require('./setup')

const queries = [
  `ALTER TABLE ${dbName}.project ADD COLUMN ipWhitelist Nullable(String) DEFAULT NULL CODEC(ZSTD(3)) AFTER ipBlacklist;`,
]

queriesRunner(queries)
