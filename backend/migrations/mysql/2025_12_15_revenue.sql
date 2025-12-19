-- Revenue / Payment provider integration fields for Project table
ALTER TABLE `project` ADD COLUMN `paddleApiKeyEnc` text DEFAULT NULL;
ALTER TABLE `project` ADD COLUMN `revenueCurrency` varchar(3) DEFAULT NULL;
ALTER TABLE `project` ADD COLUMN `paddleApiKeyPermissions` text DEFAULT NULL;
ALTER TABLE `project` ADD COLUMN `revenueLastSyncAt` datetime DEFAULT NULL;
