-- Create salt table for storing global salts in MySQL
-- Salts are cached in Redis with 10-minute TTL for performance
CREATE TABLE `salt` (
  `rotation` VARCHAR(10) NOT NULL,
  `salt` TEXT NOT NULL,
  `expiresAt` TIMESTAMP NOT NULL,
  `created` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`rotation`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
