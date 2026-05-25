ALTER TABLE `feature_flag` ADD COLUMN `scheduledChange` json DEFAULT NULL;
ALTER TABLE `feature_flag` ADD COLUMN `killSwitchActive` tinyint(1) NOT NULL DEFAULT 0;
ALTER TABLE `feature_flag` ADD COLUMN `killSwitchValue` tinyint(1) NOT NULL DEFAULT 0;
ALTER TABLE `feature_flag` ADD COLUMN `killedAt` datetime(6) DEFAULT NULL;
ALTER TABLE `feature_flag` ADD COLUMN `targetingUpdatedAt` datetime(6) DEFAULT NULL;
ALTER TABLE `feature_flag` ADD COLUMN `updated` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6);

UPDATE `feature_flag` SET `targetingUpdatedAt` = `created` WHERE `targetingUpdatedAt` IS NULL;
