alter table extension modify column `version` varchar(255) NOT NULL DEFAULT '0.0.1' AFTER description;
alter table extension modify column `status` enum('ACCEPTED','REJECTED','PENDING','NO_EXTENSION_UPLOADED') NOT NULL AFTER version;
