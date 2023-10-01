CREATE TABLE IF NOT EXISTS `payout` (
  `id` varchar(36) NOT NULL,
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `amount` decimal(10,0) NOT NULL,
  `currency` varchar(3) NOT NULL,
  `referralId` varchar(36) NOT NULL,
  `status` enum('processing','pending','paid','suspended') DEFAULT 'pending',
  `paidAt` timestamp NULL DEFAULT NULL,
  `transactionId` varchar(50) DEFAULT NULL,
  `userId` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

alter table user add column if not exists `referrerID` varchar(255) DEFAULT NULL after `receiveLoginNotifications`;
alter table user add column if not exists `paypalPaymentsEmail` varchar(254) DEFAULT NULL after `referrerID`;
alter table user add column if not exists `refCode` varchar(8) DEFAULT NULL after `paypalPaymentsEmail`;
