alter table user modify column `planCode` enum('none','free','trial','hobby','freelancer','100k','200k','500k','startup','2m','enterprise','10m','15m','20m') NOT NULL DEFAULT 'trial' after roles;
