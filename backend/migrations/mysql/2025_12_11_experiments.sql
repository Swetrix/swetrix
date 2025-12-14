-- Experiments table migration
CREATE TABLE IF NOT EXISTS `experiment` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `hypothesis` varchar(500) DEFAULT NULL,
  `status` enum('draft', 'running', 'paused', 'completed') NOT NULL DEFAULT 'draft',
  `exposureTrigger` enum('feature_flag', 'custom_event') NOT NULL DEFAULT 'feature_flag',
  `customEventName` varchar(200) DEFAULT NULL,
  `multipleVariantHandling` enum('exclude', 'first_exposure') NOT NULL DEFAULT 'exclude',
  `filterInternalUsers` tinyint(1) NOT NULL DEFAULT 1,
  `featureFlagMode` enum('create', 'link') NOT NULL DEFAULT 'create',
  `featureFlagKey` varchar(100) DEFAULT NULL,
  `startedAt` datetime DEFAULT NULL,
  `endedAt` datetime DEFAULT NULL,
  `created` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `projectId` varchar(12) DEFAULT NULL,
  `featureFlagId` varchar(36) DEFAULT NULL,
  `goalId` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_experiment_project` (`projectId`),
  KEY `FK_experiment_feature_flag` (`featureFlagId`),
  KEY `FK_experiment_goal` (`goalId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Experiment variants table
CREATE TABLE IF NOT EXISTS `experiment_variant` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `key` varchar(100) NOT NULL,
  `description` varchar(300) DEFAULT NULL,
  `rolloutPercentage` tinyint UNSIGNED NOT NULL DEFAULT 50,
  `isControl` tinyint(1) NOT NULL DEFAULT 0,
  `experimentId` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_experiment_variant_experiment` (`experimentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add experimentId to feature_flag table for linking
ALTER TABLE `feature_flag` ADD COLUMN `experimentId` varchar(36) DEFAULT NULL;
ALTER TABLE `feature_flag` ADD KEY `FK_feature_flag_experiment` (`experimentId`);
