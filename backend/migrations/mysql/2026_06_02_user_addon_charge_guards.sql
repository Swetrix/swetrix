ALTER TABLE `user_addon`
  ADD COLUMN `recurringAmount` decimal(10,2) DEFAULT NULL AFTER `currency`,
  ADD COLUMN `lastChargeId` varchar(36) DEFAULT NULL AFTER `cancelledAt`,
  ADD COLUMN `lastChargeAt` timestamp NULL DEFAULT NULL AFTER `lastChargeId`;

ALTER TABLE `user_addon_charge`
  ADD COLUMN `idempotencyKey` varchar(191) DEFAULT NULL AFTER `periodEnd`,
  ADD UNIQUE KEY `IDX_user_addon_charge_idempotency` (`idempotencyKey`);
