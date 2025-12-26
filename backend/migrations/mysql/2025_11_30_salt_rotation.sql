-- Add saltRotation column to project table
-- This determines which global salt (daily/weekly/monthly) to use for visitor hashing
ALTER TABLE `project` ADD COLUMN `saltRotation` ENUM('daily', 'weekly', 'monthly') NOT NULL DEFAULT 'daily' AFTER `botsProtectionLevel`;
