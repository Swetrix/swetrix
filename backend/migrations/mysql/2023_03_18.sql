alter table action_token modify column `action` enum('0', '1', '2', '3', '4') default null after newValue;
alter table user modify column `reportFrequency` enum('never','weekly','monthly','quarterly') not null default 'monthly' after `isActive`;

CREATE TABLE `project_subscriber` (
  `id` varchar(36) NOT NULL,
  `projectId` varchar(12) NOT NULL,
  `email` varchar(254) NOT NULL,
  `reportFrequency` enum('quarterly','monthly','weekly','never') NOT NULL,
  `isConfirmed` tinyint NOT NULL DEFAULT '0',
  `addedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
