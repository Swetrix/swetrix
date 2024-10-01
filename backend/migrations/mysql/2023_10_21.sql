CREATE TABLE `comment` (
  `extensionId` varchar(255) NOT NULL,
  `userId` varchar(255) NOT NULL,
  `text` text,
  `rating` int DEFAULT NULL,
  `addedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `id` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`extensionId`) REFERENCES `extension` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `comment_reply` (
  `id` varchar(36) NOT NULL,
  `userId` varchar(255) NOT NULL,
  `text` text NOT NULL,
  `addedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `parentCommentId` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`parentCommentId`) REFERENCES `comment` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
