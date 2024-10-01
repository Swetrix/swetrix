CREATE TABLE `funnel` (
  `id` varchar(36) NOT NULL,
  `name` varchar(50) NOT NULL,
  `steps` text NOT NULL,
  `created` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `projectId` varchar(12) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
