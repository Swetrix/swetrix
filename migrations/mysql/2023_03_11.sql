alter table extension modify column `version` varchar(255) NOT NULL DEFAULT '0.0.1' AFTER description;
alter table extension modify column `status` enum('ACCEPTED','REJECTED','PENDING','NO_EXTENSION_UPLOADED') NOT NULL AFTER version;

alter table extension_to_project add column `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) AFTER isActive;
alter table extension add column `tags` text NOT NULL AFTER fileURL;
