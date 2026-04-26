ALTER TABLE `notification_channel`
  ADD COLUMN `disabledReason` varchar(255) DEFAULT NULL AFTER `verificationToken`;
