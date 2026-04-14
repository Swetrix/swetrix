ALTER TABLE `project`
  ADD COLUMN `bwtAccessTokenEnc` text DEFAULT NULL,
  ADD COLUMN `bwtRefreshTokenEnc` text DEFAULT NULL,
  ADD COLUMN `bwtTokenExpiry` bigint DEFAULT NULL,
  ADD COLUMN `bwtScope` varchar(512) DEFAULT NULL,
  ADD COLUMN `bwtSiteUrl` varchar(512) DEFAULT NULL,
  ADD COLUMN `bwtAccountEmail` varchar(256) DEFAULT NULL;
