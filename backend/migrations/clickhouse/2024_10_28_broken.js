const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Step 1: Create Temporary Table
  `
  CREATE TABLE IF NOT EXISTS ${dbName}.analytics_temp AS ${dbName}.analytics
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, created);
  `,

  // Step 2: Insert Data with Backfilled psid
  // TODO: Refactor it. It will fail if there are more than 50 million rows.
  `INSERT INTO ${dbName}.analytics_temp
   SELECT
     IF(psid IS NOT NULL, psid,
       dense_rank() OVER (
         PARTITION BY toDate(created), br, os, lc, cc, rg, ct
         ORDER BY created
       )
     ) AS psid,
     pid,
     pg,
		 NULL as prev,
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
   FROM ${dbName}.analytics`,

  // Step 3: Swap Tables
  `
  RENAME TABLE ${dbName}.analytics TO ${dbName}.analytics_backup, ${dbName}.analytics_temp TO ${dbName}.analytics;
  `,

  // Step 4: Drop Backup Table (Optional)
  // `
  // DROP TABLE ${dbName}.analytics_backup;
  // `,

  // Step 5: Drop the Obsolete `unique` Column
  // `ALTER TABLE ${dbName}.analytics DROP COLUMN IF EXISTS unique;`,
]

queriesRunner(queries, true)
