CREATE TABLE `billing_invoice` (
  `id` varchar(36) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `provider` varchar(20) NOT NULL DEFAULT 'paddle',
  `providerPaymentId` varchar(100) NOT NULL,
  `providerSubscriptionId` varchar(20) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) NOT NULL,
  `status` enum('paid','refunded','pending') NOT NULL DEFAULT 'paid',
  `planCode` varchar(50) DEFAULT NULL,
  `billingFrequency` varchar(10) DEFAULT NULL,
  `receiptUrl` varchar(500) DEFAULT NULL,
  `billedAt` timestamp NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_billing_invoice_providerPaymentId` (`providerPaymentId`),
  KEY `IDX_billing_invoice_userId` (`userId`),
  CONSTRAINT `FK_billing_invoice_user` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
