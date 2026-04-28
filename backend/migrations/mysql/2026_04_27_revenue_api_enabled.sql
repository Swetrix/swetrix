-- Enable direct API-based revenue ingestion (POST /log/revenue)
ALTER TABLE `project` ADD COLUMN `revenueApiEnabled` tinyint(1) NOT NULL DEFAULT 0;
