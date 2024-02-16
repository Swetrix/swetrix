alter table user add column `planExceedContactedAt` timestamp NULL DEFAULT NULL AFTER `registeredWithGithub`;
alter table user add column `dashboardBlockReason` enum('exceeding_plan_limits','trial_ended','payment_failed','subscription_cancelled') DEFAULT NULL AFTER `planExceedContactedAt`;
alter table user add column `isAccountBillingSuspended` tinyint NOT NULL DEFAULT '0' AFTER `dashboardBlockReason`;
