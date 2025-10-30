ALTER TABLE project
  ADD COLUMN `gscPropertyUri` varchar(512) DEFAULT NULL AFTER `organisationId`,
  ADD COLUMN `gscAccessTokenEnc` text DEFAULT NULL AFTER `gscPropertyUri`,
  ADD COLUMN `gscRefreshTokenEnc` text DEFAULT NULL AFTER `gscAccessTokenEnc`,
  ADD COLUMN `gscTokenExpiry` bigint DEFAULT NULL AFTER `gscRefreshTokenEnc`,
  ADD COLUMN `gscScope` varchar(512) DEFAULT NULL AFTER `gscTokenExpiry`;
