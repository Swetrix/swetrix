alter table user add column `googleId` varchar(255) DEFAULT NULL AFTER cancellationEffectiveDate;
alter table user add column `registeredWithGoogle` tinyint NOT NULL DEFAULT '0' AFTER googleId;
