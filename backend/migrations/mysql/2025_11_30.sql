CREATE TABLE `annotation` (
  `id` varchar(36) NOT NULL,
  `date` date NOT NULL,
  `text` varchar(120) NOT NULL,
  `created` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `projectId` varchar(12) DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`projectId`) REFERENCES `project` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
