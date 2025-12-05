-- Remove saltRotation column from project table
-- This column is no longer needed as salt rotation is now handled globally
ALTER TABLE `project` DROP COLUMN `saltRotation`;
