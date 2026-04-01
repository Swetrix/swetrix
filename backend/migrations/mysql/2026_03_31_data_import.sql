-- Data import table for tracking imports from third-party analytics providers
CREATE TABLE IF NOT EXISTS `data_import` (
  `id` int NOT NULL AUTO_INCREMENT,
  `importId` tinyint UNSIGNED NOT NULL,
  `projectId` varchar(12) NOT NULL,
  `provider` varchar(30) NOT NULL,
  `status` enum('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
  `dateFrom` date DEFAULT NULL,
  `dateTo` date DEFAULT NULL,
  `totalRows` int NOT NULL DEFAULT 0,
  `importedRows` int NOT NULL DEFAULT 0,
  `invalidRows` int NOT NULL DEFAULT 0,
  `errorMessage` text DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `finishedAt` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_data_import_project` (`projectId`),
  CONSTRAINT `FK_data_import_project` FOREIGN KEY (`projectId`) REFERENCES `project` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
