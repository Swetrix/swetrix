const { queriesRunner, dbName } = require('./setup')

const SESSION_ID_OFFSET = '586912831'

// Generates insert queries from 2022-01-01 where psid is NULL.
const generateInsertQueries = () => {
  const queries = []
  const currentDate = new Date('2021-01-01')
  const endDate = new Date()

  while (currentDate <= endDate) {
    // Calculate the start of next month
    const nextMonth = new Date(currentDate)
    nextMonth.setMonth(nextMonth.getMonth() + 1)

    // Ensure we don't go past the end date
    const queryEndDate = nextMonth > endDate ? endDate : nextMonth

    queries.push(`
      INSERT INTO ${dbName}.analytics_temp
      WITH SessionStarts AS (
        SELECT 
          *,
          ${SESSION_ID_OFFSET} + dense_rank() OVER (
            PARTITION BY toDate(created)
            ORDER BY br, os, lc, cc, rg, ct, created
          ) AS session_id
        FROM ${dbName}.analytics
        WHERE isNull(psid) AND created >= parseDateTimeBestEffort('${currentDate.toISOString()}') AND created < parseDateTimeBestEffort('${queryEndDate.toISOString()}')
      ),
      SessionsAssigned AS (
        SELECT 
          a.*,
          LAST_VALUE(a.session_id) OVER (
            PARTITION BY toDate(a.created), a.br, a.os, a.lc, a.cc, a.rg, a.ct
            ORDER BY a.created
            RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          ) AS new_psid
        FROM SessionStarts a
      )
      SELECT 
        CASE 
          WHEN isNotNull(psid) THEN psid
          ELSE new_psid
        END AS psid,
        pid,
        pg,
        dv,
        br,
        brv,
        os,
        osv,
        lc,
        ref,
        so,
        me,
        ca,
        te,
        co,
        cc,
        rg,
        ct,
        meta.key,
        meta.value,
        unique,
        created
      FROM SessionsAssigned
    `)

    // Move to the next month
    currentDate.setMonth(currentDate.getMonth() + 1)
  }

  return queries
}

const queries = [
  `DROP TABLE IF EXISTS ${dbName}.analytics_temp;`,

  // Step 1: Create Temporary Table
  `CREATE TABLE ${dbName}.analytics_temp AS ${dbName}.analytics
    ENGINE = MergeTree()
    PARTITION BY toYYYYMM(created)
    ORDER BY (pid, created);`,

  // Step 2: Backfill session identifiers
  ...generateInsertQueries(),
  `INSERT INTO analytics_temp SELECT * FROM analytics WHERE isNotNull(psid);`,

  // Step 3: Swap Tables
  `RENAME TABLE ${dbName}.analytics TO ${dbName}.analytics_backup, ${dbName}.analytics_temp TO ${dbName}.analytics;`,

  // Step 4: Drop Backup Table
  // `DROP TABLE ${dbName}.analytics_backup;`,

  // Step 5: Drop the Obsolete 'unique' Column
  // `ALTER TABLE ${dbName}.analytics DROP COLUMN IF EXISTS unique;`
]

queriesRunner(queries, true)
