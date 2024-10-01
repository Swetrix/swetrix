DROP TABLE projects_views_custom_events;
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

CREATE TABLE `projects_views_custom_events` (
  `id` varchar(36) NOT NULL,
  `viewId` varchar(255) NOT NULL,
  `customEventName` varchar(255) NOT NULL,
  `metaKey` varchar(255) DEFAULT NULL,
  `metaValue` varchar(255) DEFAULT NULL,
  `metricKey` varchar(255) NOT NULL,
  `metaValueType` enum('string','integer','float') NOT NULL DEFAULT 'string',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`viewId`) REFERENCES `projects_views` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
