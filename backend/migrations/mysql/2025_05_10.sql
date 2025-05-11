ALTER TABLE alert ADD COLUMN `alert_on_new_errors_only` tinyint NOT NULL DEFAULT '1';

-- Add errors to the queryMetric enum
ALTER TABLE alert MODIFY COLUMN `queryMetric` enum('page_views','unique_page_views','online_users','custom_events','errors') DEFAULT NULL AFTER `created`;

-- Change lastTriggered from DATE to DATETIME, preserving the date and setting time to 00:00:00
-- Step 1: Add a new temporary DATETIME column
ALTER TABLE alert ADD COLUMN `lastTriggered_temp_dt` DATETIME DEFAULT NULL;

-- Step 2: Populate the temporary column, converting existing DATE values to DATETIME
-- This will set the time part to 00:00:00 for non-NULL dates
UPDATE alert SET `lastTriggered_temp_dt` = CAST(`lastTriggered` AS DATETIME) WHERE `lastTriggered` IS NOT NULL;

-- Step 3: Remove the old lastTriggered column (which was DATE type)
ALTER TABLE alert DROP COLUMN `lastTriggered`;

-- Step 4: Rename the temporary column to the final name 'lastTriggered'
ALTER TABLE alert CHANGE COLUMN `lastTriggered_temp_dt` `lastTriggered` DATETIME DEFAULT NULL;
