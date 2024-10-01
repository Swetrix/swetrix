DROP TABLE IF EXISTS monitor;
DROP TABLE IF EXISTS monitor_groups;

CREATE TABLE `monitor` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `type` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `url` varchar(255) NOT NULL,
  `interval` int NOT NULL,
  `retries` int NOT NULL,
  `retryInterval` int NOT NULL,
  `timeout` int NOT NULL,
  `acceptedStatusCodes` json NOT NULL,
  `description` text,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `httpOptions` json DEFAULT NULL,
  `projectId` varchar(12) DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`projectId`) REFERENCES `project` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
