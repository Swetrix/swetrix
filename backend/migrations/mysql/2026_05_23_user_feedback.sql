CREATE TABLE IF NOT EXISTS `user_feedback` (
  `id` varchar(36) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `message` text NOT NULL,
  `attachmentUrls` json NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_user_feedback_user` (`userId`),
  KEY `IDX_user_feedback_createdAt` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
