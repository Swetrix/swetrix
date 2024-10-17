ALTER TABLE project ADD COLUMN `botsProtectionLevel` enum('off','basic') NOT NULL DEFAULT 'basic' AFTER `isArchived`;
