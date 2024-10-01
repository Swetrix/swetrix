alter table project add column `isAnalyticsProject` tinyint NOT NULL DEFAULT '1' AFTER adminId;
alter table project add column `isCaptchaProject` tinyint NOT NULL DEFAULT '0' AFTER isAnalyticsProject;
alter table project add column `isCaptchaEnabled` tinyint NOT NULL DEFAULT '0' AFTER isCaptchaProject;
alter table project add column `captchaSecretKey` varchar(50) DEFAULT NULL AFTER isCaptchaEnabled;
