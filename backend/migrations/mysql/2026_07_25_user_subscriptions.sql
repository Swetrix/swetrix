-- Historic Paddle subscription ids per user.
--
-- `user.subID` holds only the current subscription and is nulled by
-- cleanUpUnpaidSubUsers once a cancellation period lapses; Paddle Classic also
-- issues a new subscription id whenever a churned customer resubscribes. Both
-- severed the link to /subscription/payments, hiding the entire invoice history
-- of cancelled and returning customers.
CREATE TABLE `user_subscription` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `userId` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `subID` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `paddleUserId` varchar(32) DEFAULT NULL,
  `planId` varchar(16) DEFAULT NULL,
  `startedAt` timestamp NULL DEFAULT NULL,
  `endedAt` timestamp NULL DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_user_subscription_sub` (`subID`),
  KEY `IDX_user_subscription_user` (`userId`),
  CONSTRAINT `FK_user_subscription_user` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
