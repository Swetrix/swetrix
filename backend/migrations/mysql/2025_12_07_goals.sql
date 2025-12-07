-- Goals table migration
CREATE TABLE IF NOT EXISTS `goal` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` enum('pageview', 'custom_event') NOT NULL,
  `matchType` enum('exact', 'contains', 'regex') NOT NULL DEFAULT 'exact',
  `value` varchar(500) DEFAULT NULL,
  `metadataFilters` json DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `projectId` varchar(12) DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`projectId`) REFERENCES `project` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
