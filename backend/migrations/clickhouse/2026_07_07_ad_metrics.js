const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Daily campaign-level metrics synced from ad platforms (Google Ads, etc.)
  `CREATE TABLE IF NOT EXISTS ${dbName}.ad_metrics
  (
    pid FixedString(12),
    provider LowCardinality(String),
    account_id String CODEC(ZSTD(3)),
    campaign_id String CODEC(ZSTD(3)),
    campaign_name String CODEC(ZSTD(3)),
    campaign_status LowCardinality(String),
    date Date,
    impressions UInt64,
    clicks UInt64,
    cost Decimal64(4),
    original_cost Decimal64(4),
    original_currency LowCardinality(String),
    currency LowCardinality(String),
    conversions Decimal64(2),
    conversions_value Decimal64(4),
    synced_at DateTime('UTC') CODEC(Delta(4), LZ4)
  )
  ENGINE = ReplacingMergeTree(synced_at)
  PARTITION BY toYYYYMM(date)
  ORDER BY (pid, provider, campaign_id, date);`,
]

queriesRunner(queries)
