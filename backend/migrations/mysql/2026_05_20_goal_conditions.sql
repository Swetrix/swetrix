ALTER TABLE `goal`
  ADD COLUMN `conditions` json DEFAULT NULL AFTER `metadataFilters`;
