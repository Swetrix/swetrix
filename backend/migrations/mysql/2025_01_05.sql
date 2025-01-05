ALTER TABLE user ADD COLUMN `featureFlags` set('dashboard-period-selector','dashboard-analytics-tabs') NOT NULL DEFAULT '' AFTER `discordWebhookUrl`;
