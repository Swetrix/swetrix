// This migration adds the websiteUrl column to the project table
// Used to display favicons and create clickable links in the dashboard
const { queriesRunner, dbName } = require('./setup')

const queries = [
  `ALTER TABLE ${dbName}.project ADD COLUMN websiteUrl Nullable(String) DEFAULT NULL AFTER adminId;`,
]

queriesRunner(queries)
