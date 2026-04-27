ALTER TABLE `ai_chat`
  ADD COLUMN `parent_chat_id` varchar(36) DEFAULT NULL;

CREATE INDEX `idx_ai_chat_parent_chat_id` ON `ai_chat` (`parent_chat_id`);
