const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Added password-related columns
  `DROP TABLE IF EXISTS ${dbName}.project_temp`,
  `CREATE TABLE IF NOT EXISTS ${dbName}.project_temp
  (
    id FixedString(12),
    name String,
    origins Nullable(String),
    ipBlacklist Nullable(String),
    active Int8,
    public Int8,
    isPasswordProtected Int8,
    passwordHash Nullable(String),
    created DateTime
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (created);`,

  `INSERT INTO ${dbName}.project_temp (*)
  SELECT id, name, origins, ipBlacklist, active, public, 0, NULL, created FROM ${dbName}.project`,

  `DROP TABLE ${dbName}.project`,
  `RENAME TABLE ${dbName}.project_temp TO ${dbName}.project`,

  // Added funnel table
  `CREATE TABLE IF NOT EXISTS ${dbName}.funnel
  (
    id String,
    name String,
    steps String,
    projectId FixedString(12),
    created DateTime
  )
  ENGINE = MergeTree()
  PRIMARY KEY id;`,
]

queriesRunner(queries)
