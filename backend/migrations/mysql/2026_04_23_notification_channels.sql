-- Notification channels: polymorphic (user/org/project) channel registry,
-- many-to-many to alerts, plus per-alert message templates.
CREATE TABLE IF NOT EXISTS `notification_channel` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` enum('email','telegram','discord','slack','webhook','webpush') NOT NULL,
  `config` json NOT NULL,
  `isVerified` tinyint(1) NOT NULL DEFAULT 0,
  `verificationToken` varchar(64) DEFAULT NULL,
  `created` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `userId` varchar(36) DEFAULT NULL,
  `organisationId` varchar(36) DEFAULT NULL,
  `projectId` varchar(12) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_notification_channel_user` (`userId`),
  KEY `IDX_notification_channel_org` (`organisationId`),
  KEY `IDX_notification_channel_project` (`projectId`),
  CONSTRAINT `channel_scope_check` CHECK (
    ((`userId` IS NOT NULL) + (`organisationId` IS NOT NULL) + (`projectId` IS NOT NULL)) = 1
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `alert_channels` (
  `alertId` varchar(36) NOT NULL,
  `channelId` varchar(36) NOT NULL,
  PRIMARY KEY (`alertId`, `channelId`),
  KEY `IDX_alert_channels_channel` (`channelId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `alert`
  ADD COLUMN `messageTemplate` text DEFAULT NULL,
  ADD COLUMN `emailSubjectTemplate` varchar(255) DEFAULT NULL;

-- Backfill: create user-scoped channels from existing user.* notification fields.
INSERT INTO `notification_channel` (`id`, `name`, `type`, `config`, `isVerified`, `userId`)
SELECT
  UUID(),
  'Telegram',
  'telegram',
  JSON_OBJECT('chatId', `telegramChatId`),
  1,
  `id`
FROM `user`
WHERE `telegramChatId` IS NOT NULL AND `isTelegramChatIdConfirmed` = 1;

INSERT INTO `notification_channel` (`id`, `name`, `type`, `config`, `isVerified`, `userId`)
SELECT
  UUID(),
  'Slack',
  'slack',
  JSON_OBJECT('url', `slackWebhookUrl`),
  1,
  `id`
FROM `user`
WHERE `slackWebhookUrl` IS NOT NULL AND `slackWebhookUrl` <> '';

INSERT INTO `notification_channel` (`id`, `name`, `type`, `config`, `isVerified`, `userId`)
SELECT
  UUID(),
  'Discord',
  'discord',
  JSON_OBJECT('url', `discordWebhookUrl`),
  1,
  `id`
FROM `user`
WHERE `discordWebhookUrl` IS NOT NULL AND `discordWebhookUrl` <> '';

-- Link every existing alert to all of its project owner's freshly-created channels
-- so current broadcast behaviour is preserved.
INSERT IGNORE INTO `alert_channels` (`alertId`, `channelId`)
SELECT a.`id`, nc.`id`
FROM `alert` a
JOIN `project` p
  ON p.`id` = a.`projectId` COLLATE utf8mb4_0900_ai_ci
JOIN `notification_channel` nc
  ON nc.`userId` COLLATE utf8mb4_0900_ai_ci = p.`adminId`
WHERE nc.`userId` IS NOT NULL;
