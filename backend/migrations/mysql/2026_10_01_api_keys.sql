CREATE TABLE IF NOT EXISTS `api_key` (
  `id` varchar(36) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `name` varchar(80) NOT NULL,
  `keyHash` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `encryptedKey` text NOT NULL,
  `keyPreview` varchar(32) NOT NULL,
  `scopes` json NOT NULL,
  `projectIds` json NOT NULL,
  `allProjects` boolean NOT NULL DEFAULT false,
  `unrestricted` boolean NOT NULL DEFAULT false,
  `created` varchar(30) DEFAULT NULL,
  `rotated` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_api_key_hash` (`keyHash`),
  KEY `IDX_api_key_user` (`userId`),
  CONSTRAINT `FK_api_key_user` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
