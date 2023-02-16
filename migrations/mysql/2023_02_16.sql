alter table user modify column `planCode` enum('none','free','trial','hobby','freelancer','startup','enterprise') not null default 'trial' after roles;
alter table user add column trialEndDate date default null after timeFormat;
alter table user add column cancellationEffectiveDate date default null after trialEndDate;
alter table user add column trialReminderSent tinyint NOT NULL DEFAULT '0' after cancellationEffectiveDate;
