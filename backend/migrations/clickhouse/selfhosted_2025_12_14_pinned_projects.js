// This migration adds pinned projects support for self-hosted instances
const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Create pinned_project table for storing user's pinned/favorited projects
  `CREATE TABLE IF NOT EXISTS ${dbName}.pinned_project
  (
    id String,
    visitorId String,
    projectId FixedString(12),
    created DateTime('UTC')
  )
  ENGINE = ReplacingMergeTree(created)
  ORDER BY (visitorId, projectId)
  PARTITION BY toYYYYMM(created);`,
]

queriesRunner(queries)
