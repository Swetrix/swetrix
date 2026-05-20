ALTER TABLE project ADD COLUMN `captchaDifficultyMode` enum('manual','auto') NOT NULL DEFAULT 'manual' AFTER `captchaDifficulty`;
