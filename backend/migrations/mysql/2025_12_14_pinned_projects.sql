-- Pinned projects table migration
-- Allows users to pin/favorite projects for quick access
CREATE TABLE IF NOT EXISTS `pinned_project` (
  `id` varchar(36) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `projectId` varchar(12) NOT NULL,
  `created` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_pinned_project_user_project` (`userId`, `projectId`),
  KEY `FK_pinned_project_user` (`userId`),
  KEY `FK_pinned_project_project` (`projectId`),
  FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`projectId`) REFERENCES `project` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
