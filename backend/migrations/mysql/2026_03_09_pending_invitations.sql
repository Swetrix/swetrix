-- Pending invitations table for inviting unregistered users
CREATE TABLE IF NOT EXISTS `pending_invitation` (
  `id` varchar(36) NOT NULL,
  `email` varchar(254) NOT NULL,
  `type` enum('project_share', 'organisation_member') NOT NULL,
  `projectId` varchar(255) DEFAULT NULL,
  `organisationId` varchar(255) DEFAULT NULL,
  `role` varchar(255) NOT NULL,
  `inviterId` varchar(255) NOT NULL,
  `created` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_pending_invitation_email` (`email`),
  KEY `IDX_pending_invitation_project` (`projectId`),
  KEY `IDX_pending_invitation_organisation` (`organisationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add registeredViaInvitation flag to user table
ALTER TABLE `user` ADD COLUMN `registeredViaInvitation` tinyint(1) NOT NULL DEFAULT 0;
