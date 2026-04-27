ALTER TABLE project MODIFY COLUMN `botsProtectionLevel` enum('off','basic','strict') NOT NULL DEFAULT 'basic';
