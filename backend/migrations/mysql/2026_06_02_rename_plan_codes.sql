ALTER TABLE `user` MODIFY COLUMN `planCode` enum('none','free','trial','hobby','freelancer','50k','100k','200k','500k','startup','1m','2m','enterprise','5m','10m','15m','20m','30m','40m','50m') NOT NULL DEFAULT 'none';

UPDATE `user` SET `planCode` = '1m' WHERE `planCode` = 'startup';

UPDATE `user` SET `planCode` = '5m' WHERE `planCode` = 'enterprise';

ALTER TABLE `user` MODIFY COLUMN `planCode` enum('none','free','trial','hobby','freelancer','50k','100k','200k','500k','1m','2m','5m','10m','15m','20m','30m','40m','50m') NOT NULL DEFAULT 'none';
