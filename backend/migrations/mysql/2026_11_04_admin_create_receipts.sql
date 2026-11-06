CREATE TABLE IF NOT EXISTS `admin_create_receipt` (
  `requestId` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `fingerprint` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `response` mediumtext DEFAULT NULL,
  `expiresAt` datetime(6) NOT NULL,
  PRIMARY KEY (`requestId`),
  KEY `IDX_admin_create_receipt_expiry` (`expiresAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
