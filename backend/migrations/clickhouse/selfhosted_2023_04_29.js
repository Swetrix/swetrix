const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Added 'prev' column
  `DROP TABLE IF EXISTS ${dbName}.project_temp`,
  `CREATE TABLE IF NOT EXISTS ${dbName}.project_temp
  (
    id FixedString(12),
    name String,
    origins Nullable(String),
    ipBlacklist Nullable(String),
    active Int8,
    public Int8,
    created DateTime
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (created);`,

  `INSERT INTO ${dbName}.project_temp (id, name, origins, ipBlacklist, active, public, created)
  SELECT id, name, origins, NULL, active, public, created FROM ${dbName}.project`,

  `DROP TABLE ${dbName}.project`,
  `RENAME TABLE ${dbName}.project_temp TO ${dbName}.project`,
]

queriesRunner(queries)
