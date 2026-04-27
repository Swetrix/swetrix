ALTER TABLE `ai_chat`
  ADD COLUMN `pinned` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN `tags` text DEFAULT NULL;

CREATE INDEX `idx_ai_chat_pinned_updated` ON `ai_chat` (`pinned`, `updated`);
