-- Add captchaDifficulty column to project table
-- This controls the PoW difficulty for CAPTCHA verification
-- Default is 4 (requires 4 leading zeros in hash, ~65k iterations, ~1-2 seconds)

ALTER TABLE project ADD COLUMN `captchaDifficulty` TINYINT UNSIGNED NOT NULL DEFAULT 4;

