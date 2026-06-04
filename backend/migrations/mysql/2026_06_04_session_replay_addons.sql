ALTER TABLE `user_addon`
  MODIFY COLUMN `code` enum('websites','session_replays') NOT NULL;
