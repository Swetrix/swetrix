const { queriesRunner, dbName } = require('./setup');

const queries = [
  // Monitor responses table
  `CREATE TABLE IF NOT EXISTS ${dbName}.monitor_responses
  (
    monitorID FixedString(36),         
    region LowCardinality(Nullable(String)),
    responseTime UInt32,
    timestamp UInt32,              
    statusCode UInt32,
    created DateTime('UTC') DEFAULT now()
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (monitorID, created);`,
];

queriesRunner(queries);
