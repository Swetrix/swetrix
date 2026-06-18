ALTER TABLE `user`
  ADD COLUMN `trialLifecycleEmailsSent` json DEFAULT NULL AFTER `trialReminderSent`;
