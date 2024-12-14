ALTER TABLE action_token MODIFY COLUMN `action` enum('0','1','2','3','4','5','6') NOT NULL AFTER newValue;

CREATE TABLE `organisation` (
  `id` varchar(36) NOT NULL,
  `name` varchar(50) NOT NULL,
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `organisation_member` (
  `id` varchar(36) NOT NULL,
  `role` enum('owner','admin','viewer') NOT NULL,
  `confirmed` tinyint NOT NULL DEFAULT '0',
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `userId` varchar(36) DEFAULT NULL,
  `organisationId` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE project ADD COLUMN `organisationId` varchar(36) DEFAULT NULL AFTER `botsProtectionLevel`;

