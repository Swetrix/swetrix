alter table user add column `slackWebhookUrl` varchar(255) DEFAULT NULL AFTER apiKey;
alter table user add column `discordWebhookUrl` varchar(255) DEFAULT NULL AFTER slackWebhookUrl;
