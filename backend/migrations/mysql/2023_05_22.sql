alter table user add column `tierCurrency` varchar(3) DEFAULT NULL AFTER cancellationEffectiveDate;
update user set tierCurrency='USD' where planCode != 'none' and planCode != 'free' and planCode != 'trial';
