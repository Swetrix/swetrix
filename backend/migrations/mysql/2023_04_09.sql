alter table project add column `isTransferring` tinyint NOT NULL DEFAULT '0' AFTER public;
alter table action_token modify column `action` enum('0', '1', '2', '3', '4', '5') default null after newValue;
