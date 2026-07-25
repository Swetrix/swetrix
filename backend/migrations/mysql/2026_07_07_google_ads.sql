ALTER TABLE project
  ADD COLUMN `googleAdsCustomerId` varchar(32) DEFAULT NULL AFTER `gscAccountEmail`,
  ADD COLUMN `googleAdsLoginCustomerId` varchar(32) DEFAULT NULL AFTER `googleAdsCustomerId`,
  ADD COLUMN `googleAdsAccessTokenEnc` text DEFAULT NULL AFTER `googleAdsLoginCustomerId`,
  ADD COLUMN `googleAdsRefreshTokenEnc` text DEFAULT NULL AFTER `googleAdsAccessTokenEnc`,
  ADD COLUMN `googleAdsTokenExpiry` bigint DEFAULT NULL AFTER `googleAdsRefreshTokenEnc`,
  ADD COLUMN `googleAdsScope` varchar(512) DEFAULT NULL AFTER `googleAdsTokenExpiry`,
  ADD COLUMN `googleAdsAccountEmail` varchar(256) DEFAULT NULL AFTER `googleAdsScope`,
  ADD COLUMN `googleAdsCurrency` varchar(3) DEFAULT NULL AFTER `googleAdsAccountEmail`,
  ADD COLUMN `googleAdsLastSyncAt` datetime DEFAULT NULL AFTER `googleAdsCurrency`,
  ADD COLUMN `googleAdsSyncError` varchar(512) DEFAULT NULL AFTER `googleAdsLastSyncAt`;

ALTER TABLE project
  ADD KEY `idx_project_google_ads_sync` (`googleAdsCustomerId`, `googleAdsSyncError`);
