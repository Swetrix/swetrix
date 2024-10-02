const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Added 'Project views' table
  `CREATE TABLE IF NOT EXISTS ${dbName}.project_views
  (
    id FixedString(36),
    projectId FixedString(12),
    name String,
    type String,
    filters Nullable(String),
    createdAt DateTime,
    updatedAt DateTime
  )
  ENGINE = MergeTree()
  PRIMARY KEY id;`,

  // Added 'Project views -- custom events' table
  `CREATE TABLE IF NOT EXISTS ${dbName}.projects_views_custom_events
  (
    id FixedString(36),
    viewId FixedString(36),
    customEventName String,
    metaKey Nullable(String),
    metaValue Nullable(String),
    metricKey String,
    metaValueType String
  )
  ENGINE = MergeTree()
  PRIMARY KEY id;`,
]

queriesRunner(queries)
