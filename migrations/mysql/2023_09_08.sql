CREATE TABLE IF NOT EXISTS `delete_feedback` (
  `id` varchar(36) NOT NULL,
  `feedback` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
