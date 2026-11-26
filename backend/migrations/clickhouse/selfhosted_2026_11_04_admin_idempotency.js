const createReceiptTable = (dbName) => `CREATE TABLE IF NOT EXISTS ${dbName}.admin_create_receipt (
    requestId FixedString(64), fingerprint FixedString(64), attempt String, response String,
    created DateTime('UTC') DEFAULT now(), completed UInt8 DEFAULT 0
  ) ENGINE = MergeTree ORDER BY (requestId, created)
  TTL created + INTERVAL 24 HOUR DELETE`

module.exports = { createReceiptTable }

if (require.main === module) {
  const { queriesRunner, dbName } = require('./setup')
  queriesRunner([createReceiptTable(dbName)])
}
