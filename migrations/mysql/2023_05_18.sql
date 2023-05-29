ALTER TABLE `project` ADD COLUMN `passwordHash` VARCHAR(60) DEFAULT NULL AFTER `isTransferring`;
ALTER TABLE `project` ADD COLUMN `isPasswordProtected` TINYINT(1) NOT NULL DEFAULT 0 AFTER `passwordHash`;
