const { queriesRunner, dbName } = require('./setup')

const queries = [
  `SELECT throwIf(
    count() = 0,
    'The ${dbName}.events table does not exist. Run 2026_05_01_unify_events.js before dropping legacy tables.'
  )
  FROM system.tables
  WHERE database = '${dbName}' AND name = 'events';`,

  `DROP TABLE IF EXISTS ${dbName}.analytics;`,
  `DROP TABLE IF EXISTS ${dbName}.customEV;`,
  `DROP TABLE IF EXISTS ${dbName}.errors;`,
  `DROP TABLE IF EXISTS ${dbName}.performance;`,
  `DROP TABLE IF EXISTS ${dbName}.captcha;`,
]

queriesRunner(queries)
