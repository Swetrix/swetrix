ALTER TABLE `user` MODIFY COLUMN `planCode` enum('none','free','trial','hobby','freelancer','50k','100k','200k','500k','startup','2m','enterprise','10m','15m','20m','30m','40m','50m') NOT NULL DEFAULT 'none';

ALTER TABLE `user` ADD COLUMN `planType` enum('standard','plus','enterprise') DEFAULT NULL AFTER `planCode`;

ALTER TABLE `user` ADD COLUMN `addonOverrides` json DEFAULT NULL AFTER `planType`;

ALTER TABLE `user` ADD COLUMN `entitlementOverrides` json DEFAULT NULL AFTER `addonOverrides`;
