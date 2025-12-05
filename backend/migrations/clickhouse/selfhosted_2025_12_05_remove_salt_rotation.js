// This migration removes the saltRotation column from the project table for self-hosted instances
// Salt rotation is now handled globally and no longer configurable per-project
const { queriesRunner, dbName } = require('./setup')

const queries = [
  `ALTER TABLE ${dbName}.project DROP COLUMN IF EXISTS saltRotation;`,
]

queriesRunner(queries)
