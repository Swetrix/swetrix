const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Revenue table for storing payment/transaction data from payment providers
  `CREATE TABLE IF NOT EXISTS ${dbName}.revenue
  (
    pid FixedString(12),
    transaction_id String CODEC(ZSTD(3)),
    provider LowCardinality(String),
    type LowCardinality(String),
    status LowCardinality(String),
    amount Decimal64(4),
    original_amount Decimal64(4),
    original_currency LowCardinality(String),
    currency LowCardinality(String),
    profile_id Nullable(String) CODEC(ZSTD(3)),
    session_id Nullable(String) CODEC(ZSTD(3)),
    customer_email Nullable(String) CODEC(ZSTD(3)),
    product_id Nullable(String) CODEC(ZSTD(3)),
    product_name Nullable(String) CODEC(ZSTD(3)),
    metadata String DEFAULT '{}' CODEC(ZSTD(3)),
    created DateTime('UTC') CODEC(Delta(4), LZ4),
    synced_at DateTime('UTC') CODEC(Delta(4), LZ4)
  )
  ENGINE = ReplacingMergeTree(synced_at)
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, transaction_id);`,
]

queriesRunner(queries)
