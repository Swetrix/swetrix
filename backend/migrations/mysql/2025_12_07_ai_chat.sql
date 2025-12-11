-- AI Chat history table
CREATE TABLE IF NOT EXISTS `ai_chat` (
  `id` varchar(36) NOT NULL,
  `name` varchar(200) DEFAULT NULL,
  `messages` json NOT NULL,
  `created` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `projectId` varchar(12) NOT NULL,
  `userId` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ai_chat_project` (`projectId`),
  KEY `idx_ai_chat_user` (`userId`),
  KEY `idx_ai_chat_updated` (`updated`),
  FOREIGN KEY (`projectId`) REFERENCES `project` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
