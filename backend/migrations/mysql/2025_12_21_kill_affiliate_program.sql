ALTER TABLE user DROP COLUMN `paypalPaymentsEmail`;
ALTER TABLE user DROP COLUMN `refCode`;
ALTER TABLE user DROP COLUMN `referrerID`;

DROP TABLE IF EXISTS `payout`;
