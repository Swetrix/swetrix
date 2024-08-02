DROP TABLE projects_views;

CREATE TABLE `projects_views` (
  `id` varchar(36) NOT NULL,
  `projectId` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` enum('traffic','performance') NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `filters` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`projectId`) REFERENCES `project` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
