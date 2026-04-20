-- Managed reverse proxy domains for the "Bypass adblockers" feature
CREATE TABLE IF NOT EXISTS `proxy_domain` (
  `id` varchar(36) NOT NULL,
  `projectId` varchar(12) NOT NULL,
  `hostname` varchar(253) NOT NULL,
  `proxyTargetId` varchar(32) NOT NULL,
  `status` enum('waiting', 'issuing', 'live', 'error') NOT NULL DEFAULT 'waiting',
  `errorMessage` varchar(500) DEFAULT NULL,
  `lastCheckedAt` datetime DEFAULT NULL,
  `liveSince` datetime DEFAULT NULL,
  `statusChangedAt` datetime DEFAULT NULL,
  `created` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_proxy_domain_hostname` (`hostname`),
  UNIQUE KEY `UQ_proxy_domain_target` (`proxyTargetId`),
  KEY `IDX_proxy_domain_project` (`projectId`),
  KEY `IDX_proxy_domain_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
