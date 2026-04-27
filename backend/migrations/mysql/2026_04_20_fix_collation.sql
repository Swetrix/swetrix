-- Fix collation mismatch for tables created on MariaDB 10.10+, where the
-- server default collation changed to utf8mb4_uca1400_ai_ci. The rest of
-- the schema (notably `project`) uses utf8mb4_general_ci, so joins/filters
-- across these tables fail with ER_CANT_AGGREGATE_2COLLATIONS.
ALTER TABLE `proxy_domain` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
ALTER TABLE `data_import` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
