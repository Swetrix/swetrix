ALTER TABLE `project`
  ADD COLUMN `sessionReplayRetentionDays` int unsigned NOT NULL DEFAULT 30;
