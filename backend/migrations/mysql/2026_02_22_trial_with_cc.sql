ALTER TABLE `user` MODIFY COLUMN `onboardingStep` enum('language','welcome','feature_traffic','feature_errors','feature_sessions','select_plan','create_project','setup_tracking','waiting_for_events','verify_email','completed') NOT NULL DEFAULT 'language';

ALTER TABLE `user` MODIFY COLUMN `planCode` enum('none','free','trial','hobby','freelancer','50k','100k','200k','500k','startup','2m','enterprise','10m','15m','20m') NOT NULL DEFAULT 'none';

CREATE TABLE `cancellation_feedback` (
  `id` varchar(36) NOT NULL,
  `email` varchar(254) DEFAULT NULL,
  `planCode` varchar(50) DEFAULT NULL,
  `feedback` text DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
