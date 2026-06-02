ALTER TABLE `user_addon`
  ADD COLUMN `recurringAmount` decimal(10,2) DEFAULT NULL AFTER `currency`,
  ADD COLUMN `lastChargeId` varchar(36) DEFAULT NULL AFTER `cancelledAt`,
  ADD COLUMN `lastChargeAt` timestamp NULL DEFAULT NULL AFTER `lastChargeId`;

UPDATE `user_addon`
SET `recurringAmount` = ROUND(
  (`quantity` / 50) *
  CASE `currency`
    WHEN 'EUR' THEN 7
    WHEN 'GBP' THEN 6
    ELSE 7.5
  END *
  CASE `billingInterval`
    WHEN 'yearly' THEN 10
    ELSE 1
  END,
  2
)
WHERE `quantity` > 0
  AND `status` <> 'cancelled';

ALTER TABLE `user_addon_charge`
  ADD COLUMN `idempotencyKey` varchar(191) DEFAULT NULL AFTER `periodEnd`,
  ADD UNIQUE KEY `IDX_user_addon_charge_idempotency` (`idempotencyKey`);
