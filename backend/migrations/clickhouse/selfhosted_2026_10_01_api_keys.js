const { queriesRunner, dbName } = require('./setup')

queriesRunner([
  `CREATE TABLE IF NOT EXISTS ${dbName}.api_key (
    id String, userId String, name String, keyHash String,
    encryptedKey String, keyPreview String, scopes String, projectIds String,
    allProjects UInt8 DEFAULT 0, unrestricted UInt8 DEFAULT 0,
    created Nullable(String), rotated Nullable(String)
  ) ENGINE = MergeTree() ORDER BY (userId, id)`,
])
