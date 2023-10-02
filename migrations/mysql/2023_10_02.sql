alter table user modify column `planCode` enum('none','free','trial','hobby','freelancer','200k','500k','startup','2m','enterprise','10m') NOT NULL DEFAULT 'trial' after roles;
