alter table user add column `githubId` int DEFAULT NULL AFTER registeredWithGoogle;
alter table user add column `registeredWithGithub` tinyint NOT NULL DEFAULT '0' AFTER githubId;
