// This migration adds the saltRotation column to the project table for self-hosted instances
const { queriesRunner, dbName } = require('./setup')

const queries = [
  `ALTER TABLE ${dbName}.project ADD COLUMN IF NOT EXISTS saltRotation String DEFAULT 'daily';`,
]

queriesRunner(queries)
