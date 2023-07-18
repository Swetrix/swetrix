CREATE TABLE IF NOT EXISTS `message` (
  `id` varchar(36) NOT NULL,
  `chatId` varchar(255) NOT NULL,
  `text` text NOT NULL,
  `extra` json DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;