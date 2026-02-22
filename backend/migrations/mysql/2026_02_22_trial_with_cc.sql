ALTER TABLE `user` MODIFY COLUMN `onboardingStep` enum('language','welcome','feature_traffic','feature_errors','feature_sessions','select_plan','create_project','setup_tracking','waiting_for_events','verify_email','completed') NOT NULL DEFAULT 'language';

CREATE TABLE `cancellation_feedback` (
  `id` varchar(36) NOT NULL,
  `email` varchar(254) DEFAULT NULL,
  `planCode` varchar(50) DEFAULT NULL,
  `feedback` text DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
