alter table action_token modify column `action` enum('0', '1', '2', '3', '4', '5') default null after newValue;
