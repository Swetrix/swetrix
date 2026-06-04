ALTER TABLE `user_addon`
  ADD COLUMN `recurringAmount` decimal(10,2) DEFAULT NULL AFTER `currency`,
  ADD COLUMN `lastChargeId` varchar(36) DEFAULT NULL AFTER `cancelledAt`,
  ADD COLUMN `lastChargeAt` timestamp NULL DEFAULT NULL AFTER `lastChargeId`;

UPDATE `user_addon` addon
JOIN (
  SELECT 50 AS `quantity`, 0 AS `minQuantity`, 249 AS `maxQuantity`, 7.5 AS `USD`, 7 AS `EUR`, 6 AS `GBP`
  UNION ALL SELECT 250, 250, 999, 30, 27, 24
  UNION ALL SELECT 1000, 1000, 1000, 99, 89, 79
) bundle_price
  ON addon.`quantity` BETWEEN bundle_price.`minQuantity` AND bundle_price.`maxQuantity`
SET addon.`recurringAmount` = ROUND(
  (addon.`quantity` / bundle_price.`quantity`) *
  CASE addon.`currency`
    WHEN 'EUR' THEN bundle_price.`EUR`
    WHEN 'GBP' THEN bundle_price.`GBP`
    ELSE bundle_price.`USD`
  END *
  CASE addon.`billingInterval`
    WHEN 'yearly' THEN 10
    ELSE 1
  END,
  2
)
WHERE addon.`quantity` > 0
  AND addon.`status` <> 'cancelled';

ALTER TABLE `user_addon_charge`
  ADD COLUMN `idempotencyKey` varchar(191) DEFAULT NULL AFTER `periodEnd`,
  ADD UNIQUE KEY `IDX_user_addon_charge_idempotency` (`idempotencyKey`);
