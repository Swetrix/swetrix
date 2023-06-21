alter table user add column `receiveLoginNotifications` tinyint NOT NULL DEFAULT '1' AFTER isTelegramChatIdConfirmed;
