-- Feature flags table migration
CREATE TABLE IF NOT EXISTS `feature_flag` (
  `id` varchar(36) NOT NULL,
  `key` varchar(100) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `flagType` enum('boolean', 'rollout') NOT NULL DEFAULT 'boolean',
  `rolloutPercentage` tinyint UNSIGNED NOT NULL DEFAULT 100,
  `targetingRules` json DEFAULT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `created` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `projectId` varchar(12) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_key_per_project` (`projectId`, `key`),
  FOREIGN KEY (`projectId`) REFERENCES `project` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
