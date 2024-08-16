const { queriesRunner, dbName } = require('./setup');

const queries = [
  // Monitor responses table
  `CREATE TABLE IF NOT EXISTS ${dbName}.monitor_responses
  (
    monitorId UInt64,         
    region LowCardinality(Nullable(String)),
    responseTime UInt32,
    timestamp UInt32,              
    statusCode UInt32,
    created DateTime('UTC') DEFAULT now()
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (monitorId, created);`,
];

queriesRunner(queries);
